import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    ViewStyle,
    useWindowDimensions,
} from "react-native";
import type { NavigationState, Route } from "react-native-tab-view";

export interface SwipeableTabBarProps {
    /**
     * Navigation state containing index and routes
     */
    navigationState: NavigationState<Route>;

    /**
     * Animated position value from TabView (0 to routes.length - 1)
     */
    position: Animated.Value | Animated.AnimatedInterpolation<number>;

    /**
     * Callback when a tab is pressed
     */
    jumpTo: (key: string) => void;

    /**
     * Active tab color (for text and indicator)
     */
    activeColor?: string;

    /**
     * Inactive tab color
     */
    inactiveColor?: string;

    /**
     * Style for the tab bar container
     */
    style?: ViewStyle;

    /**
     * Style for each tab item
     */
    tabStyle?: ViewStyle;

    /**
     * Style for the active indicator line
     */
    indicatorStyle?: ViewStyle;

    /**
     * Style for the indicator container
     */
    indicatorContainerStyle?: ViewStyle;

    /**
     * Custom render function for tab item content
     */
    renderTabLabel?: (props: {
        route: Route;
        focused: boolean;
        color: string;
    }) => React.ReactNode;

    /**
     * Gap between tabs
     */
    gap?: number;

    /**
     * Whether tabs scroll or distribute evenly
     */
    scrollEnabled?: boolean;

    /**
     * Callback when tab is pressed (for custom behavior like scroll-to-top)
     */
    onTabPress?: (props: { route: Route; preventDefault: () => void }) => void;

    /**
     * Callback when tab is long-pressed
     */
    onTabLongPress?: (props: { route: Route }) => void;
}

export const SwipeableTabBar = React.memo(function SwipeableTabBar({
    navigationState,
    position,
    jumpTo,
    activeColor = "#4C5FAB",
    inactiveColor = "#6B7280",
    style,
    tabStyle,
    indicatorStyle,
    indicatorContainerStyle,
    renderTabLabel,
    gap = 0,
    scrollEnabled,
    onTabPress,
    onTabLongPress,
}: SwipeableTabBarProps) {
    const { routes, index } = navigationState;
    const { width: screenWidth } = useWindowDimensions();
    const tabsWrapperRef = useRef<View>(null);
    const [tabsWidth, setTabsWidth] = useState<number>(screenWidth);
    const [activeIndex, setActiveIndex] = useState(index);

    useEffect(() => {
        setActiveIndex(index);
    }, [index]);

    // Measure the actual tab wrapper width for accurate positioning
    const handleTabsLayout = (event: any) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0) {
            setTabsWidth(width);
        }
    };

    // Calculate input range for animation
    const inputRange = useMemo(() => routes.map((_, i) => i), [routes.length]);

    // Calculate indicator translateX position based on actual tab width
    // Each tab occupies tabsWidth / routes.length pixels
    const tabWidth = tabsWidth / routes.length;
    const indicatorTranslateX = useMemo(
        () =>
            position.interpolate({
                inputRange,
                outputRange: inputRange.map((i) => i * tabWidth),
            }),
        [routes.length, position, tabWidth],
    );

    const handleTabPress = (route: Route, tabIndex: number) => {
        let shouldNavigate = true;

        if (onTabPress) {
            onTabPress({
                route,
                preventDefault: () => {
                    shouldNavigate = false;
                },
            });
        }

        if (shouldNavigate && tabIndex !== index) {
            setActiveIndex(tabIndex);
            jumpTo(route.key);
        }
    };

    const handleTabLongPress = (route: Route) => {
        if (onTabLongPress) {
            onTabLongPress({ route });
        }
    };

    return (
        <View style={[styles.tabBarContainer, { gap }, style]}>
            {/* Tab items */}
            {scrollEnabled ? (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    onContentSizeChange={(w) => {
                        if (w > 0) setTabsWidth(w);
                    }}
                >
                    <View
                        ref={tabsWrapperRef}
                        onLayout={handleTabsLayout}
                        style={[
                            styles.tabsWrapper,
                            styles.tabsWrapperScrollable,
                            // {
                            //     backgroundColor: "red",
                            // },
                        ]}
                    >
                        {routes.map((route, i) => {
                            const isActive = i === activeIndex;

                            return (
                                <Pressable
                                    key={route.key}
                                    onPress={() => handleTabPress(route, i)}
                                    onLongPress={() =>
                                        handleTabLongPress(route)
                                    }
                                    style={[
                                        styles.tab,
                                        styles.tabScrollable,
                                        tabStyle,
                                        {
                                            backgroundColor: isActive
                                                ? activeColor
                                                : undefined,
                                            borderRadius: 4,
                                        },
                                    ]}
                                >
                                    {renderTabLabel ? (
                                        renderTabLabel({
                                            route,
                                            focused: isActive,
                                            color: isActive
                                                ? "white"
                                                : inactiveColor,
                                        })
                                    ) : (
                                        <Animated.Text
                                            style={[
                                                styles.tabLabel,
                                                {
                                                    color: isActive
                                                        ? "white"
                                                        : inactiveColor,
                                                },
                                            ]}
                                        >
                                            {route.title}
                                        </Animated.Text>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </ScrollView>
            ) : (
                <View
                    ref={tabsWrapperRef}
                    onLayout={handleTabsLayout}
                    style={styles.tabsWrapper}
                >
                    {routes.map((route, i) => {
                        const isActive = i === activeIndex;

                        return (
                            <Pressable
                                key={route.key}
                                onPress={() => handleTabPress(route, i)}
                                onLongPress={() => handleTabLongPress(route)}
                                style={[styles.tab, tabStyle]}
                            >
                                {renderTabLabel ? (
                                    renderTabLabel({
                                        route,
                                        focused: isActive,
                                        color: isActive
                                            ? activeColor
                                            : inactiveColor,
                                    })
                                ) : (
                                    <Animated.Text
                                        style={[
                                            styles.tabLabel,
                                            {
                                                color: isActive
                                                    ? activeColor
                                                    : inactiveColor,
                                            },
                                        ]}
                                    >
                                        {route.title}
                                    </Animated.Text>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            )}

            {/* Animated indicator */}
            {!scrollEnabled ? (
                <View
                    style={[styles.indicatorContainer, indicatorContainerStyle]}
                >
                    <Animated.View
                        style={[
                            styles.indicator,
                            {
                                width: tabWidth,
                                transform: [
                                    { translateX: indicatorTranslateX },
                                ],
                            },
                            indicatorStyle,
                        ]}
                    />
                </View>
            ) : null}
        </View>
    );
});

const styles = StyleSheet.create({
    tabBarContainer: {
        backgroundColor: "#fff",
    },
    tabsWrapper: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
    },
    tabsWrapperScrollable: {
        justifyContent: "flex-start",
    },
    scrollContent: {
        flexGrow: 1,
    },
    tab: {
        flex: 1,
        paddingVertical: 15,
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    tabScrollable: {
        flex: 0,
        minWidth: 80,
    },
    tabLabel: {
        fontSize: 15,
        fontWeight: "600",
        textAlign: "center",
    },
    indicatorContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    indicator: {
        position: "absolute",
        bottom: 0,
        height: 3,
        backgroundColor: "#4C5FAB",
        borderRadius: 3,
    },
});
