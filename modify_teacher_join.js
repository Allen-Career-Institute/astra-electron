const fs = require('fs');
const path = require('path');

const filePath =
  '/Users/dineshkumard/ALLEN_Digital/allen-ui-live/apps/live-web-app/app/teacher-liveclass/TeacherJoinMeeting.tsx';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Find the LiveStreaming component and wrap it with Electron detection
const liveStreamingPattern =
  /(\s*<Suspense fallback={<Fragment \/>}>\s*<LiveStreaming)/;
const replacement = `$1
              {/* Disable LiveStreaming in Electron mode - streaming handled by Electron app */}
              {!isElectronTeacherApp() && `;

// Find the closing of LiveStreaming
const closingPattern = /(\s*<\/LiveStreaming>\s*<\/Suspense>)/;
const closingReplacement = `$1
              )}`;

// Apply the changes
content = content.replace(liveStreamingPattern, replacement);
content = content.replace(closingPattern, closingReplacement);

// Write back to file
fs.writeFileSync(filePath, content, 'utf8');

console.log(
  'Successfully modified TeacherJoinMeeting.tsx to conditionally render LiveStreaming in Electron mode'
);
