import fs from "node:fs";
import path from "node:path";
import * as sass from "sass";
import {
	DIST_DIR_PATH,
	DIST_FILE_NAME,
	DIST_FILE_PATH,
	ENTRY_FILE_PATH,
	IS_PROD,
} from "./constants.js";

export function build() {
	let result;

	try {
		result = sass.compile(ENTRY_FILE_PATH, {
			style: IS_PROD ? "compressed" : "expanded",
			sourceMap: false,
		});
	} catch (error) {
		console.error("Error compiling styles:", error);

		return;
	}

	// ensure the output directory exists
	fs.mkdirSync(DIST_DIR_PATH, {
		recursive: true,
	});

	// write the compiled CSS to the dist file
	fs.writeFileSync(DIST_FILE_PATH, result.css);

	if (process.env.LIMBO_STYLES_DIR_PATH) {
		try {
			fs.writeFileSync(
				path.join(process.env.LIMBO_STYLES_DIR_PATH, DIST_FILE_NAME),
				result.css
			);

			console.log(`"${DIST_FILE_NAME}" successfully copied to limbo styles directory`);
		} catch (error) {
			console.error(`Failed to copy "${DIST_FILE_NAME}" to limbo styles directory:`, error);
		}
	}
}
