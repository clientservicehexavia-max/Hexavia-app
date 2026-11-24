const appJson = require("./app.json");

const baseExpoConfig = appJson.expo;
const baseIdentifier = "com.chinexx.hexavia";

const variant =
    process.env.APP_VARIANT || process.env.EAS_BUILD_PROFILE || "production";

const isDevelopment = variant === "development";
const isPreview = variant === "preview";
const isRedesign = variant === "redesign";

const identifierSuffix = isDevelopment
    ? ".dev"
    : isPreview || isRedesign
      ? ".preview"
      : "";

const getAppName = () => {
    if (isDevelopment) return "HBM Dev";
    if (isPreview) return "HBM Preview";
    if (isRedesign) return "HBM 2.0";
    return baseExpoConfig.name;
};

module.exports = () => ({
    ...baseExpoConfig,
    name: getAppName(),
    ios: {
        ...baseExpoConfig.ios,
        bundleIdentifier: `${baseIdentifier}${identifierSuffix}`,
    },
    android: {
        ...baseExpoConfig.android,
        package: `${baseIdentifier}${identifierSuffix}`,
    },
    extra: {
        ...baseExpoConfig.extra,
        appVariant: variant,
    },
});
