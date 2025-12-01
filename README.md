# PDFShield

**Shield your documents. Work offline.**

A privacy-focused PDF toolkit that runs entirely on your computer. Your files never leave your device.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)
![Electron](https://img.shields.io/badge/electron-28.x-47848F.svg)
![React](https://img.shields.io/badge/react-18.x-61DAFB.svg)

## Features

### PDF Operations
- **Merge PDFs** - Combine multiple PDF files into one document
- **Split PDF** - Extract specific pages from a PDF
- **Edit PDF** - Rotate, delete, and reorder pages with drag & drop
- **Compress PDF** - Reduce file size with quality options (High/Medium/Low)
- **Add Watermark** - Add text watermarks with position and opacity controls
- **Images to PDF** - Create PDFs from images with drag & drop reordering

### User Experience
- **100% Offline** - All processing happens locally on your computer
- **Dark Mode** - Toggle between light and dark themes
- **Multilingual** - Available in English and Spanish
- **Drag & Drop** - Intuitive file handling and page reordering
- **Modern UI** - Clean interface built with Tailwind CSS

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Desktop**: Electron 28
- **Bundler**: Vite 5
- **Styling**: Tailwind CSS 3
- **PDF Processing**: pdf-lib, pdfjs-dist
- **Drag & Drop**: @dnd-kit
- **i18n**: i18next

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Anjos2/pdfshield.git
cd pdfshield

# Install dependencies
npm install

# Run with Electron
npm run electron:dev
```

### Building for Production

```bash
# Build for Windows (portable exe)
npm run build:win

# Output will be in the 'release' folder
```

## Usage

### Merge PDFs
1. Drag and drop or select multiple PDF files
2. Reorder files by dragging them
3. Click "Merge PDFs" to combine
4. Download the merged file

### Split PDF
1. Upload a PDF file
2. Enter page ranges (e.g., `1-3, 5, 7-10`)
3. Click "Split PDF" to extract pages
4. Download the extracted pages

### Edit PDF
1. Upload a PDF file
2. Select pages to edit
3. Use toolbar to rotate or delete pages
4. Drag pages to reorder them
5. Click "Save changes" to download

## Privacy

PDFShield is designed with privacy as a core principle:

- **No uploads**: Your files are never sent to any server
- **Local processing**: All PDF operations run in your browser/app
- **No tracking**: No analytics, no telemetry, no data collection
- **Open source**: Verify the code yourself

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Created by **Joseph Edgar Huayhualla Barboza**

- [LinkedIn](https://www.linkedin.com/in/joseph-edgar-huayhualla-barboza/)

## Support

If you find this project useful, consider supporting its development:

- Star this repository
- Share it with others
- [Support on Patreon](https://patreon.com/Anjos604)

---

**PDFShield** - Your files never leave your computer.
