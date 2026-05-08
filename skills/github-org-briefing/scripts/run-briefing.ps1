param(
  [string]$Org = "EvoMap",
  [string]$Date = "",
  [string]$Since = "24h",
  [string]$Out = "reports"
)

if ($Date) {
  npm run dev -- run -- --org $Org --date $Date --out $Out
} else {
  npm run dev -- run -- --org $Org --since $Since --out $Out
}
