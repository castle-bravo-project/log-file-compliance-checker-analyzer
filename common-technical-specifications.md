## Common Technical Specifications

### Styling Framework Implementation
- **Tailwind CSS**: Utility-first CSS framework for consistent styling
- **Custom Theme**: Dark theme with specified color palette
  - Background: `#111827` (bg-dark)
  - Content Panels: `bg-gray-800`
  - Text: `#f3f4f6` (text-light)
  - Primary: `#1e40af` (primary action color)
  - Accent: `#3b82f6` (highlights and interactions)
  - Borders: `border-gray-700`
- **Typography**: Sans-serif font stack with monospace for technical data
- **Interactive Elements**: Hover states, loading animations, and visual feedback

### Privacy & Security Requirements
- **No External Dependencies**: All processing happens client-side
- **Local Storage Only**: Optional browser storage with user consent
- **Data Encryption**: Sensitive data encrypted in local storage
- **Clear Data Policies**: Transparent data handling and deletion options
- **No Tracking**: No analytics or tracking scripts
- **HTTPS Only**: Ensure secure delivery from GitHub Pages

### GitHub Pages Deployment
- **Static Site**: Pure HTML/CSS/JavaScript applications
- **CDN Resources**: Use CDN-hosted libraries (cdnjs.cloudflare.com)
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Mobile Responsive**: Touch-friendly interfaces for tablet use
- **Performance**: Optimized loading and processing for web delivery

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **ES6+ Features**: Modern JavaScript with appropriate polyfills
- **File API**: Extensive use of File API for local file processing
- **Canvas API**: For image and visualization processing
- **Web Workers**: For heavy processing tasks to maintain UI responsiveness