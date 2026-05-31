import React from "react";
import { useWindowDimensions } from "react-native";
import {
    TabView,
    type NavigationState,
    type Route,
    type SceneRendererProps,
} from "react-native-tab-view";

import { SwipeableTabBar, type SwipeableTabBarProps } from "./SwipeableTabBar";

type SwipeableTabBarConfig = Omit<
    SwipeableTabBarProps,
    "navigationState" | "position" | "jumpTo"
>;

export interface SwipeableTabViewProps<RouteType extends Route = Route> {
    navigationState: NavigationState<RouteType>;
    onIndexChange: (index: number) => void;
    renderScene: (
        props: SceneRendererProps & { route: RouteType },
    ) => React.ReactNode;
    initialLayout?: { width: number; height?: number };
    swipeEnabled?: boolean;
    scrollEnabled?: boolean;
    lazy?: boolean;
    tabBarProps?: SwipeableTabBarConfig;
}

export function SwipeableTabView<RouteType extends Route = Route>({
    navigationState,
    onIndexChange,
    renderScene,
    initialLayout,
    swipeEnabled = true,
    scrollEnabled = false,
    lazy = true,
    tabBarProps,
}: SwipeableTabViewProps<RouteType>) {
    const layout = useWindowDimensions();

    return (
        <TabView
            navigationState={navigationState}
            onIndexChange={onIndexChange}
            initialLayout={initialLayout ?? { width: layout.width }}
            swipeEnabled={swipeEnabled}
            lazy={lazy}
            renderScene={renderScene}
            renderTabBar={(props) => (
                <SwipeableTabBar
                    navigationState={props.navigationState}
                    scrollEnabled={scrollEnabled}
                    position={props.position}
                    jumpTo={props.jumpTo}
                    {...tabBarProps}
                />
            )}
        />
    );
}
