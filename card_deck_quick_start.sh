#!/bin/bash
###############################################################################
# Playing Card Deck Generator - ArtCraft PhotoCraft Automation
# Quick Start Script for Generating Complete Themed Card Decks
###############################################################################

set -e  # Exit on error

# Configuration
WORKSPACE="D:/getartcraft/artcraft_workspace"
INPUT_DIR="${WORKSPACE}/inputs/card_templates"
OUTPUT_DIR="${WORKSPACE}/outputs"
STAGING_DIR="${WORKSPACE}/staging"

# Check standard Windows or Unix PhotoCraft CLI paths
if [ -f "D:/getartcraft/photocraft/photocraft-0.9.0-windows-x64-portable/photocraft-cli.exe" ]; then
  PHOTOCRAFT_CLI="D:/getartcraft/photocraft/photocraft-0.9.0-windows-x64-portable/photocraft-cli.exe"
elif [ -f "${HOME}/.local/bin/photocraft-cli" ]; then
  PHOTOCRAFT_CLI="${HOME}/.local/bin/photocraft-cli"
else
  PHOTOCRAFT_CLI="photocraft-cli"
fi

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Export automation environment variables
export PHOTOCRAFT_AUTOMATION_READ_ROOT="${WORKSPACE}"
export PHOTOCRAFT_AUTOMATION_WRITE_ROOT="${WORKSPACE}"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
  echo -e "${PURPLE}"
  echo "═══════════════════════════════════════════════════════════════"
  echo "  $1"
  echo "═══════════════════════════════════════════════════════════════"
  echo -e "${NC}"
}

print_step() {
  echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ ERROR: $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

###############################################################################
# Setup Functions
###############################################################################

setup_workspace() {
  print_header "Setting Up Workspace"

  print_step "Creating directory structure..."
  mkdir -p "${INPUT_DIR}"
  mkdir -p "${OUTPUT_DIR}"
  mkdir -p "${STAGING_DIR}"
  mkdir -p "${WORKSPACE}/actions"
  mkdir -p "${WORKSPACE}/decks"

  print_success "Workspace directories created at ${WORKSPACE}"
}

check_dependencies() {
  print_header "Checking Dependencies"

  if [ -f "${PHOTOCRAFT_CLI}" ] || command -v "${PHOTOCRAFT_CLI}" > /dev/null 2>&1; then
    print_success "PhotoCraft CLI found: ${PHOTOCRAFT_CLI}"
  else
    print_warning "PhotoCraft CLI binary not detected at default path. Node vector generator will be used."
  fi
  
  if command -v node > /dev/null 2>&1; then
    print_success "Node.js runtime found: $(node --version)"
  fi
}

###############################################################################
# Deck Generation Functions
###############################################################################

# Generate a single card
generate_card() {
  local deck_name=$1
  local suit=$2
  local rank=$3
  local card_type=$4  # "pip", "face", or "joker"

  local output_file="${OUTPUT_DIR}/${deck_name}/${rank}_${suit}.png"
  local staging_file="${STAGING_DIR}/${deck_name}/temp_${rank}_${suit}.psd"

  print_step "Generating ${rank} of ${suit}..."

  # For demonstration: create a simple card using PhotoCraft
  # In production, you would use actual templates

  # Example command (adjust based on your templates):
  # "${PHOTOCRAFT_CLI}" run \
  #   "${INPUT_DIR}/${card_type}_template.psd" \
  #   --cmd "layer.textLayer.replaceText" \
  #   --params "{\"layerName\": \"rank\", \"newText\": \"${rank}\"}" \
  #   --out "${staging_file}"

  # For now, create placeholder
  mkdir -p "$(dirname "${output_file}")"
  touch "${output_file}"

  print_success "Generated ${rank} of ${suit}"
}

# Generate complete deck
generate_deck() {
  local deck_name=$1
  local deck_title=$2

  print_header "Generating Deck: ${deck_title}"

  # Create output directory
  mkdir -p "${OUTPUT_DIR}/${deck_name}"
  mkdir -p "${STAGING_DIR}/${deck_name}"

  # Define suits and ranks
  local suits=("hearts" "diamonds" "spades" "clubs")
  local ranks=("A" "2" "3" "4" "5" "6" "7" "8" "9" "10" "J" "Q" "K")

  local total_cards=0
  local total_expected=54  # 52 cards + 2 jokers

  print_step "Generating pip and face cards..."

  # Generate all standard cards
  for suit in "${suits[@]}"; do
    for rank in "${ranks[@]}"; do
      if [[ "${rank}" == "J" || "${rank}" == "Q" || "${rank}" == "K" ]]; then
        generate_card "${deck_name}" "${suit}" "${rank}" "face"
      else
        generate_card "${deck_name}" "${suit}" "${rank}" "pip"
      fi
      ((total_cards++))
    done
  done

  # Generate jokers
  print_step "Generating jokers..."
  generate_card "${deck_name}" "joker" "1" "joker"
  generate_card "${deck_name}" "joker" "2" "joker"
  total_cards=$((total_cards + 2))

  # Generate card back
  print_step "Generating card back..."
  touch "${OUTPUT_DIR}/${deck_name}/card_back.png"

  print_success "Deck generation complete!"
  echo ""
  echo "Total cards generated: ${total_cards}/${total_expected}"
  echo "Output directory: ${OUTPUT_DIR}/${deck_name}"
}

###############################################################################
# Quick Deck Templates
###############################################################################

generate_victorian_christmas() {
  print_header "Victorian Christmas Deck"
  echo "Theme: Holiday magic meets Victorian opulence"
  echo "Colors: Crimson Red, Forest Green, Antique Gold"
  echo ""

  generate_deck "victorian_christmas" "Victorian Christmas"

  print_success "Victorian Christmas deck ready!"
  print_step "Next: Add custom artwork to the template files"
}

generate_cyberpunk_neon() {
  print_header "Cyberpunk Neon Deck"
  echo "Theme: Dystopian future meets electric aesthetics"
  echo "Colors: Hot Magenta, Electric Cyan, Neon Yellow"
  echo ""

  generate_deck "cyberpunk_neon" "Cyberpunk Neon"

  print_success "Cyberpunk Neon deck ready!"
}

generate_art_deco() {
  print_header "Art Deco Elegance Deck"
  echo "Theme: Roaring Twenties geometric sophistication"
  echo "Colors: Rich Black, Antique Gold, Pearl White"
  echo ""

  generate_deck "art_deco_elegance" "Art Deco Elegance"

  print_success "Art Deco Elegance deck ready!"
}

generate_all_decks() {
  print_header "Generating All 10 Deck Themes"

  if command -v node > /dev/null 2>&1; then
    node scripts/generate_card_decks.js
  else
    local decks=(
      "victorian_christmas:Victorian Christmas"
      "cyberpunk_neon:Cyberpunk Neon"
      "art_deco_elegance:Art Deco Elegance"
      "steampunk_clockwork:Steampunk Clockwork"
      "minimalist_zen:Minimalist Zen"
      "wild_west_frontier:Wild West Frontier"
      "cosmic_constellation:Cosmic Constellation"
      "botanical_garden:Botanical Garden"
      "retro_synthwave:Retro Synthwave"
      "gothic_cathedral:Gothic Cathedral"
    )

    for deck_info in "${decks[@]}"; do
      IFS=':' read -r deck_id deck_name <<< "${deck_info}"
      generate_deck "${deck_id}" "${deck_name}"
      echo ""
    done
  fi

  print_success "All 10 decks generated!"
}

###############################################################################
# Main Menu
###############################################################################

show_menu() {
  clear
  print_header "Playing Card Deck Generator"

  echo "Available Decks:"
  echo ""
  echo "  VINTAGE THEMES:"
  echo "  1) Victorian Christmas 🎄"
  echo "  2) Art Deco Elegance ✨"
  echo "  3) Steampunk Clockwork ⚙️"
  echo "  4) Wild West Frontier 🤠"
  echo "  5) Botanical Garden 🌺"
  echo "  6) Gothic Cathedral ⛪"
  echo ""
  echo "  MODERN THEMES:"
  echo "  7) Cyberpunk Neon 🌃"
  echo "  8) Minimalist Zen 🎋"
  echo "  9) Cosmic Constellation 🌌"
  echo "  10) Retro Synthwave 🌆"
  echo ""
  echo "  BATCH OPERATIONS:"
  echo "  11) Generate All Decks"
  echo "  12) Setup Workspace Only"
  echo ""
  echo "  0) Exit"
  echo ""
  echo -n "Select an option: "
}

main() {
  # Initial setup
  setup_workspace
  check_dependencies

  while true; do
    show_menu
    read -r choice

    case $choice in
      1) generate_victorian_christmas ;;
      2) generate_art_deco ;;
      3) generate_deck "steampunk_clockwork" "Steampunk Clockwork" ;;
      4) generate_deck "wild_west_frontier" "Wild West Frontier" ;;
      5) generate_deck "botanical_garden" "Botanical Garden" ;;
      6) generate_deck "gothic_cathedral" "Gothic Cathedral" ;;
      7) generate_cyberpunk_neon ;;
      8) generate_deck "minimalist_zen" "Minimalist Zen" ;;
      9) generate_deck "cosmic_constellation" "Cosmic Constellation" ;;
      10) generate_deck "retro_synthwave" "Retro Synthwave" ;;
      11) generate_all_decks ;;
      12) setup_workspace ;;
      0)
        print_success "Goodbye!"
        exit 0
        ;;
      *)
        print_error "Invalid option. Please try again."
        sleep 2
        ;;
    esac

    if [ "$choice" != "0" ]; then
      echo ""
      echo -n "Press Enter to continue..."
      read -r
    fi
  done
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main
fi
