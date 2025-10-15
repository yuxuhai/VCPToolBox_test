# 插件: 科学计算器 (SciCalculator)

`SciCalculator` 是一个同步插件，它为 AI 提供了一个功能强大的科学计算器，能够执行从基础运算到微积分的各种数学计算。

- **插件类型**: `synchronous`
- **调用命令**: `SciCalculator`

## 功能

`SciCalculator` 支持广泛的数学功能，包括：

-   **基础运算**: `+`, `-`, `*`, `/`, `//` (整除), `%` (取模), `**` (乘方)。
-   **常量**: `pi`, `e`。
-   **数学函数**: 三角函数 (`sin`, `cos`, `tan`), 反三角函数 (`asin`, `acos`, `atan`), 平方根 (`sqrt`), 对数 (`log`), 指数 (`exp`), 绝对值 (`abs`) 等。
-   **统计函数**: 平均值 (`mean`), 中位数 (`median`), 方差 (`variance`), 标准差 (`stdev`) 等。
-   **微积分**: 定积分和不定积分 (`integral`)。
-   **其他高级功能**: 误差传递 (`error_propagation`), 置信区间 (`confidence_interval`)。

## 配置

此插件开箱即用，无需在 `config.env` 文件中进行任何配置。

## 使用方法

1.  **启用插件**: 在您的工具列表文件 (例如 `supertool.txt`) 中，添加 `{{VCPSciCalculator}}` 占位符。
2.  **重启 VCP**: 重启 VCP ToolBox 服务。

AI 现在可以在需要进行数学计算时调用 `SciCalculator`。

## AI 调用示例

AI 会将需要计算的数学表达式封装在工具调用请求中。

**用户**: "请帮我计算 (2+3)*5 的结果，并求 sin(pi/2) 的值。"

**AI**:
```
<<<[TOOL_REQUEST]>>>
maid:「始」助手「末」
tool_name:「始」SciCalculator「末」
expression:「始」(2+3)*5「末」
<<<[END_TOOL_REQUEST]>>>
```
*(收到第一个结果后，AI 会继续请求第二个计算)*
```
<<<[TOOL_REQUEST]>>>
maid:「始」助手「末」
tool_name:「始」SciCalculator「末」
expression:「始」sin(pi/2)「末」
<<<[END_TOOL_REQUEST]>>>
```

### 微积分计算示例

**用户**: "计算函数 e 的 -x 平方在负无穷到正无穷上的定积分。"

**AI**:
```
<<<[TOOL_REQUEST]>>>
maid:「始」助手「末」
tool_name:「始」SciCalculator「末」
expression:「始」integral('exp(-x**2)', '-inf', 'inf')「末」
<<<[END_TOOL_REQUEST]>>>
```
**重要提示**: 在进行微积分计算时，表达式参数 `expr_str` 必须是用单引���或双引号包裹的字符串。

### 参数说明

-   **`expression`** (必需): 您要计算的完整数学表达式。

计算器会将结果返回给 AI，然后 AI 会将答案呈现给用户。
