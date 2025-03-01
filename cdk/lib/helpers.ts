export function getLambdaBundlingBashCommand(lambdaFileName: string) {
  return [
    'bash', '-c', [
      // Copy all files to asset-output
      'cp -r /asset-input/src/ /asset-output/',
      'cp -r /asset-input/package*.json /asset-output/',
      'cp -r /asset-input/tsconfig.json /asset-output/',
      'cp -r /asset-input/node_modules/ /asset-output/',
      // Install dependencies
      'cd /asset-output',
      'npm i',
      'npm run build',
      // Create dist structure
      'cp -r node_modules dist/',
      // // Cleanup
      'rm -rf node_modules',
      'rm -rf src',
      'rm package*.json',
      'rm tsconfig.json',
      'find dist -type f -name "*.ts" -delete',
      'find dist -type f -name "*.map" -delete',
      `find dist/handlers -type f ! -name ${lambdaFileName} -delete`
    ].join(' && '),
  ]
}