# DevOps MCP Extension

A VS Code extension with a sidebar panel that allows you to type text and display it in an output area.

## Features

- **Sidebar Panel**: Opens a custom panel in the VS Code activity bar
- **Text Input**: Type or paste text in the input area
- **Output Display**: Displays all submitted text with timestamps
- **Clear Function**: Clear all output with one click
- **Keyboard Shortcut**: Press Enter to submit text (Shift+Enter for new lines)

## Requirements

- VS Code version 1.85.0 or higher
- Node.js and npm

## Getting Started

### Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press `F5` to open a new VS Code window with your extension loaded

### Usage

1. Click on the DevOps MCP icon in the activity bar (left sidebar)
2. Type text in the input area
3. Click "Add Text" or press Enter to display the text below
4. View your submitted text with timestamps in the output section
5. Click "Clear Output" to remove all displayed text

### Development

- Run `npm run compile` to compile the extension
- Run `npm run watch` to compile in watch mode
- Run `npm run lint` to run the linter

## Extension Components

This extension adds:

- A new activity bar icon and sidebar view
- An input panel with text area and action buttons
- Real-time output display with timestamps

## Known Issues

None at this time.

## Release Notes

### 0.0.1

Initial release of the extension boilerplate.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
