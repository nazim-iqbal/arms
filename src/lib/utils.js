export const processGoogleDriveUrl = (url) => {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    
    // Check if it's a google drive URL
    if (urlObj.hostname.includes('drive.google.com')) {
      // Pattern 1: /file/d/ID/view
      const fileIdMatch = urlObj.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
      }
      
      // Pattern 2: ?id=ID
      const idParam = urlObj.searchParams.get('id');
      if (idParam) {
        return `https://drive.google.com/uc?export=view&id=${idParam}`;
      }
    }
  } catch (e) {
    // If URL parsing fails, just return the original string
    return url;
  }
  
  return url;
};
