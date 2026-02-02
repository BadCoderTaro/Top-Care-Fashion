// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// --- keep your SVG transformer config ---
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

const { assetExts, sourceExts } = config.resolver;
config.resolver = {
  ...config.resolver,
  assetExts: assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...sourceExts, 'svg'],
};

// --- alias missing platform shims to UnimplementedView ---
const realResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === '@react-native-picker/picker/js/PickerWindows' ||
    moduleName === '@react-native-picker/picker/js/PickerMacOS' ||
    moduleName === './PickerWindows' || // handles relative import from js/Picker.js
    moduleName === './PickerMacOS'
  ) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(
        '@react-native-picker/picker/js/UnimplementedView.js'
      ),
    };
  }
  return realResolveRequest
    ? realResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// No blacklist needed
module.exports = config;
