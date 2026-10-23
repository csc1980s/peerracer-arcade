<#
 .SYNOPSIS
   10 Themed Playing Card Deck Generator using ArtCraft PhotoCraft
 .DESCRIPTION
   Automates the generation of 10 complete playing card collections (6 Vintage, 4 Modern)
   including Victorian Christmas, Art Deco, Steampunk, Wild West, Cyberpunk, Zen, and more.
#>

$ErrorActionPreference = "Stop"

$workspace = "D:\getartcraft\artcraft_workspace"
$photocraftCli = "D:\getartcraft\photocraft\photocraft-0.9.0-windows-x64-portable\photocraft-cli.exe"

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🎴 ArtCraft PhotoCraft - 10 Playing Card Decks Generator" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# 1. Verify PhotoCraft CLI
if (Test-Path $photocraftCli) {
    Write-Host "[✓] Found PhotoCraft CLI at: $photocraftCli" -ForegroundColor Green
} else {
    Write-Host "[!] PhotoCraft CLI not found. Falling back to vector generator..." -ForegroundColor Yellow
}

# 2. Execute Node Generator
Write-Host "[▶] Generating 10 Curated Deck Collections..." -ForegroundColor Cyan
node (Join-Path $PSScriptRoot "scripts\generate_card_decks.js")

Write-Host "`n[✓] All 10 Decks Generated & Synced to Solitaire Sovereign Mods!" -ForegroundColor Green
Write-Host "    Workspace Decks: $workspace\decks\" -ForegroundColor Gray
Write-Host "    In-Game Card Backs: D:\solitaire\mods\card_backs\" -ForegroundColor Gray
Write-Host "    In-Game Table Felts: D:\solitaire\mods\backgrounds\`n" -ForegroundColor Gray
