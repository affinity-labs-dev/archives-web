# Archives Mobile App

This document provides a high-level overview of the Archives mobile application, its technical stack, and instructions for development.

## Project Overview

The "Archives" app is a mobile application built with **React Native** and the **Expo** framework. It is designed for iOS, Android, and web platforms. The app appears to be an educational or entertainment product focused on history, with features like "eras," "adventures," and user "profiles."

Key features and technologies inferred from the codebase include:

- **Authentication:** User authentication is handled by **Clerk** (`@clerk/clerk-expo`), with screens for sign-in, sign-up, and password reset. It also supports Apple Sign-In.
- **Backend:** The app interacts with a **Supabase** backend for data storage and management.
- **Navigation:** Navigation is managed by **Expo Router**, which uses a file-based routing system. The app has several navigation groups, including `(auth)`, `(onboarding)`, and `(tabs)`.
- **In-App Purchases:** The app includes in-app purchases, managed by **RevenueCat** (`react-native-purchases`).
- **Analytics:** User behavior is tracked with **PostHog**.
- **Error Reporting:** **Sentry** is used for crash and error reporting.
- **State Management:** The project uses React Context for state management, with providers for `AdventuresContent`, `BackgroundSync`, `Preferences`, `Progress`, and `Rewards`.

## Building and Running the App

To build and run the app, follow these steps:

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Run the app:**

    -   **Start the development server:**
        ```bash
        npx expo start
        ```
    -   **Run on iOS:**
        ```bash
        npx expo run:ios
        ```
    -   **Run on Android:**
        ```bash
        npx expo run:android
        ```
    -   **Run on web:**
        ```bash
        npx expo start --web
        ```

3.  **Lint the code:**

    ```bash
    npm run lint
    ```

## Development Conventions

-   **File-based Routing:** The app uses Expo Router's file-based routing. The `app` directory contains all the routes, with subdirectories for different sections of the app.
-   **Styling:** The project uses a custom theme located in `constants/ArchivesTheme.ts`.
-   **Component-Based Architecture:** The `components` directory contains reusable components used throughout the app.
-   **Services:** The `services` directory contains services for interacting with external APIs like Supabase and for handling analytics.
-   **Hooks:** The `hooks` directory contains custom hooks for managing side effects and other logic.
-   **Typed Routes:** The project uses Expo's `typedRoutes` experiment, which provides type safety for routes.
