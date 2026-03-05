export async function runAutoUpdate() {
    try {
        // Vérifie si on est dans Tauri (et pas dans le navigateur)
        const isTauri =
            typeof window !== "undefined" && (window as any).__TAURI__?.core;

        if (!isTauri) return;

        const { check } = await import("@tauri-apps/plugin-updater");
        const { relaunch } = await import("@tauri-apps/plugin-process");

        const update = await check();

        if (!update) {
            console.log("No update available");
            return;
        }

        console.log("Update found:", update.version);

        // Télécharger et installer
        await update.downloadAndInstall();

        console.log("Update installed, restarting app...");

        // Redémarrer l'application
        await relaunch();
    } catch (error) {
        console.log("Updater error:", error);
    }
}