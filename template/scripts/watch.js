import "dotenv/config";
import chokidar from "chokidar";
import { SRC_DIR_PATH } from "./constants.js";
import { build } from "./utils.js";

const watcher = chokidar.watch(SRC_DIR_PATH, {
	ignoreInitial: true,
});

watcher.on("ready", () => {
	console.log("watching styles");
});

watcher.on("add", build);
watcher.on("unlink", build);
watcher.on("change", build);

// build once when beginning
build();
