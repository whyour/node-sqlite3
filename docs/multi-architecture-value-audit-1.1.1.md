# `@whyour/sqlite3` 1.1.1 多架构类型兼容性审计

审计日期：2026-08-29  
范围：SQLite 值绑定与读取、Sequelize 6.37.5 日期解析、Node-API 数值语义、1.1.1 多架构预编译产物。

## 结论

**暂时不要把当前 1.1.1 发布到 npm。**

1.1.1 能修复“现代毫秒时间戳从 `DATETIME` 读出后导致 Sequelize 调用 `date.includes()` 崩溃”的直接路径，而且在已实测的大端、小端、32 位、64 位、glibc 和 musl 平台上行为一致。但当前实现把所有数值型 `DATETIME` 都解释为 JavaScript 毫秒，会错误转换 SQLite 官方支持的 Unix 秒和 Julian day；同时 `max(date)`、`CAST` 等表达式仍返回 Number，原异常仍可能出现。

因此，这不是某个 CPU 独有的问题，而是所有架构共有的类型契约问题。另有一个真正与架构发布相关的风险：当前通用 `linux-arm` 文件名不能区分 armv6 与 armv7。

## 处置状态（1.1.2）

1.1.1 的 GitHub Release、14 个附件和远端标签已于审计后撤回；npm 发布从未成功，因此 npm registry 无需撤回。1.1.2 按以下方案修正：

- 默认保留 SQLite 原始日期存储类型；仅在显式设置 `dateMode = iso-milliseconds` 时转换有 `DATETIME` 声明元数据的直接列。
- JavaScript `Date` 改为写入 ISO-8601 文本，避免继续制造无单位的数值日期。
- 所有 JavaScript 安全整数使用 `sqlite3_bind_int64`；支持完整 signed int64 范围的 BigInt 输入，越界立即报错。
- 新增 `number`、`safe`、`bigint` 三种整数读取模式；`safe` 对安全值返回 Number、对不安全值返回 BigInt，不发生精度丢失。
- 空 BLOB 使用 SQLite 零 BLOB API，规避 `malloc(0)` 的 libc 差异。
- 日期、整数、BigInt 和空 BLOB 测试加入 glibc、musl、Windows 和 macOS 发布矩阵。
- 通用 `linux-arm-musl` 明确统一为 ARMv7，不再让 ARMv6 和 ARMv7 产物互相覆盖；ARMv6 用户必须显式选择源码构建。

## 实测覆盖

以下历史测试均直接加载撤回前的 v1.1.1 Release 对应 `.node` 产物，而不是只检查能否编译。

| 平台 | 位宽 / 字节序 / libc | 结果 |
|---|---|---|
| macOS arm64 / Node 24 | 64 位、小端、Darwin | 通过；复现全部共有问题 |
| Linux x64 / Node 24 | 64 位、小端、glibc | 通过；行为一致 |
| Linux armv7 / Node 22 | 32 位、小端、glibc | 通过；行为一致 |
| Linux arm64 / Node 24 | 64 位、小端、musl | 通过；行为一致 |
| Linux ia32 | 32 位、小端、musl | 通过；行为一致 |
| Linux ppc64le / Node 24 | 64 位、小端、glibc | 通过；行为一致 |
| Linux s390x / Node 20 | 64 位、**大端**、glibc | 通过；行为一致 |
| Windows x64 / Node 24 | 64 位、小端、Windows | 构建和打包成功；现有 CI 未运行类型测试 |

三个发布工作流的 15 个任务全部成功，共上传 14 个产物：[Alpine](https://github.com/whyour/node-sqlite3/actions/runs/33236167945)、[Debian](https://github.com/whyour/node-sqlite3/actions/runs/33236170946)、[Windows/macOS](https://github.com/whyour/node-sqlite3/actions/runs/33236175731)。静态检查也确认十个 Linux 产物的 ELF 位宽、CPU 和字节序正确，包括 s390x 的 MSB 与 ia32/ARM 的 32 位格式。

## 发现的问题

### 1. 阻断发布：合法数值日期被误解释

[SQLite 官方文档](https://www.sqlite.org/datatype3.html#date_and_time_datatype)明确允许日期使用三种格式：ISO-8601 文本、Unix 秒整数、Julian day 实数。当前实现仅依据列声明为 `DATETIME`，就调用按毫秒工作的 Node-API Date。

真实产物结果：

| 数据库值 | 本来含义 | 1.1.1 返回值 |
|---:|---|---|
| `1690000000000` | JavaScript 毫秒 | `2023-07-22T04:26:40.000Z`，符合本次兼容目标 |
| `1690000000` | Unix 秒 | `1970-01-20T13:26:40.000Z`，错误 |
| `2460000.5` | Julian day | `1970-01-01T00:41:00.000Z`，错误 |

这三项在 x64、ARM、ia32、ppc64le、s390x、glibc、musl 和 macOS 上完全一致。

### 2. 高风险：SQL 表达式仍可能触发原异常

[SQLite `sqlite3_column_decltype()` 文档](https://www.sqlite.org/c3ref/column_decltype.html)规定，表达式或子查询结果可能没有声明类型。实测：

- 直接列、普通别名、视图和测试中的 CTE 能返回 ISO 字符串；
- `max(milliseconds) AS milliseconds` 返回 Number；
- `CAST(milliseconds AS DATETIME) AS milliseconds` 返回 Number。

如果 Sequelize 将表达式别名映射回 DATE 属性，Number 仍会进入 `DATE.parse()` 并调用 `.includes()`。所以当前修复只覆盖部分查询形态。

### 3. 高风险：BIGINT 会丢失或静默变成 NULL

[Node-API 官方文档](https://nodejs.org/api/n-api.html#napi_create_int64)说明，int64 转 JavaScript Number 后，超出 `±(2^53-1)` 就会丢失精度。实测数据库整数 `9007199254740993` 返回 `9007199254740992`。

更严重的是，直接绑定 JavaScript BigInt 时，当前代码没有识别该类型，随后静默跳过参数绑定，SQLite 最终写入 SQL `NULL`。该问题在 s390x glibc 与 arm64 musl 上均已复现。Sequelize 当前会先把 BigInt 转成字符串，因此其写入路径可绕开一部分问题，但读取仍会丢精度。上游曾有 [BigInt PR #1501](https://github.com/TryGhost/node-sqlite3/pull/1501)，最终未合并。

`lastID` 和 change 事件中的 rowid 也使用 Number，存在相同的超安全整数风险。

### 4. 中风险：int32 边界改变 SQLite 存储类型

当前仅把 int32 范围内的 JavaScript Number 当作整数，且使用 `sqlite3_bind_int`；更大的安全整数走 `sqlite3_bind_double`。在无类型亲和性的列中实测：

| JavaScript Number | SQLite `typeof()` |
|---:|---|
| `2147483647` | `integer` |
| `2147483648` | `real` |
| `-2147483649` | `real` |
| `9007199254740991` | `real` |

这会影响类型判断、比较和上层解析器，即使这些值仍是 JavaScript 可精确表示的整数。

### 5. 中风险：发布 CI 没有验证本次修改

Linux 工作流只运行 I/O 与 musl 兼容测试，没有运行新增的 `datetime_compat.test.js`；Windows/macOS 工作流只编译和打包，不运行运行时类型测试。所以工作流全绿只能证明产物能够构建和基础 I/O 正常，不能证明日期转换正确。

### 6. 架构风险：armv6 与 armv7 共用一个产物名

当前产物名只有 `linux-arm`：

- glibc 的通用 ARM 产物实际在 armv7 上构建；
- musl 的通用 ARM 产物实际在 armv6 上构建，armv7 上传被跳过。

上游项目也明确说明预构建选择器无法区分 armv6/armv7，因此[不提供通用 ARM 预编译包](https://github.com/TryGhost/node-sqlite3#prebuilt-binaries)。armv6 glibc 环境可能下载到 armv7 指令集的二进制；这是本次审计中唯一明确的“只影响特定架构组合”的问题。

此外，目前没有 glibc ia32、Windows arm64、Linux riscv64/loong64 产物，这些平台会回退源码编译或直接安装失败，取决于用户工具链。Node 官方当前主要支持的 Linux 架构可参考 [Node.js BUILDING](https://github.com/nodejs/node/blob/main/BUILDING.md#platform-list)。

### 7. 低风险：空 BLOB 的可移植性细节

空 BLOB 当前会走 `malloc(0)`，随后对可能为空的指针调用长度为 0 的 `memcpy`。测试过的 glibc 与 musl 均正常返回长度为 0 的 Buffer，但增加 `len > 0` 保护可以消除编译器、sanitizer 和 libc 实现差异。

## Issue #3063 中需要纠正的判断

[Issue #3063](https://github.com/whyour/qinglong/issues/3063)提出两处 `.includes()`：日期值和 `PRAGMA type`。

- 日期值不是“Date 对象”；旧驱动实际返回 Number，这确实违反 Sequelize SQLite DATE 解析器的字符串预期。
- `applyParsers(type, value)` 的 `type` 来自 `PRAGMA table_info().type`。当前驱动和所有实测架构都返回字符串；[Sequelize v6.37.5 源码](https://github.com/sequelize/sequelize/blob/v6.37.5/src/dialects/sqlite/query.js)也证实该数据流。因此第二处不是当前驱动产生的同类问题。
- 直接改为 `String(date)` 不安全：数值毫秒拼接时区后不一定能形成有效日期字符串，也掩盖了 Unix 秒和 Julian day 的单位差异。

## 建议修复顺序

1. **停止 npm 发布当前 1.1.1**，修正后发布 1.1.2。
2. 驱动默认保持 SQLite 原始存储类型，不根据声明的 `DATETIME` 猜测时间单位。
3. Qinglong 的旧毫秒数据通过明确策略处理：迁移已知的 Sequelize 时间戳列，或增加显式连接选项启用“DATETIME 数值按 epoch 毫秒转换”。不要把该策略无条件应用到所有 SQLite 用户。
4. Sequelize 防御代码应先判断 `typeof date === 'number'`，仅在明确知道它是旧毫秒数据时执行 `new Date(date)`；字符串继续走原时区逻辑。
5. JavaScript 安全整数统一使用 `sqlite3_bind_int64`，非整数才使用 `sqlite3_bind_double`。
6. 增加 BigInt 绑定，并提供明确的整数读取模式 `number`、`safe`、`bigint`；`safe` 模式对超安全范围的值返回 BigInt，保持无损。
7. 不支持的绑定参数必须报错，不能静默跳过并写成 NULL。
8. 将日期三种格式、表达式、int32/安全整数边界、BigInt、空 BLOB 和 PRAGMA 类型测试加入所有 Linux 矩阵；Windows/macOS 构建后运行对应测试。
9. ARM 产物必须包含 armv6/armv7 选择信息；在现有安装器做不到时，不发布含糊的通用 ARM 文件，改为源码构建回退。

## 限制

Windows x64 只获得了成功构建与打包证据，没有本地执行其 `.node` 文件。Linux 大端 ppc64 不是 Node 官方 Linux 目标；已测试官方支持的 ppc64le。除此之外，代表性的字节序、位宽、CPU 与 libc 组合均已用真实 1.1.1 产物运行，结果已经收敛。
