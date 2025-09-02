import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import * as utils from "poopgen/utils";

// helpers

/**
 * @returns {never}
 */
function cancel() {
	p.cancel("cancelled");
	process.exit(0);
}

/**
 * @param {string} destPath
 */
async function initGit(destPath) {
	const spinner = p.spinner();

	spinner.start("Initializing Git repo...");

	const dirIsInsideGitRepo = await utils.dirIsInsideGitRepo(destPath);

	if (dirIsInsideGitRepo) {
		spinner.stop("Docs are inside a Git repo, skipping");

		return;
	}

	try {
		await utils.initGit({
			cwd: destPath,
		});
	} catch {
		spinner.stop("Failed to initialize Git repo, skipping");
	}

	spinner.stop("Successfully intialized Git repo");
}

/** @type{import("poopgen").BeforeFn} */
export async function before(ctx) {
	const nameInput = await p.text({
		message: "What do you want to name your plugin?",
		defaultValue: "Mint Starter Kit",
		validate: (value) => {
			if (value.trim().length === 0) {
				return "Name is required";
			}
		},
	});

	if (p.isCancel(nameInput)) {
		cancel();
	}

	const { dir, name, packageName } = utils.parseProjectName(nameInput, ctx.dir.path);

	if (fs.existsSync(dir)) {
		if (fs.readdirSync(dir).length > 0) {
			p.cancel(`${dir} already exists and is not empty, aborting`);
			process.exit(1);
		}
	}

	// set the output directory
	ctx.dir.path = dir;

	// add the theme's name to our context
	ctx.data.theme = {
		name,
	};

	// --- format package.json ---

	const packageJSONEntry = /** @type {import("poopgen").FileEntry} */ (
		ctx.dir.entries.find((entry) => entry.path === "package.json")
	);

	const pkg = JSON.parse(packageJSONEntry.content);

	// set the name to the name of the theme
	pkg.name = packageName;

	// replace the contents with the updated package.json
	packageJSONEntry.content = JSON.stringify(pkg, null, "\t");
}

/** @type{import("poopgen").AfterFn} */
export async function after(ctx) {
	const dest = ctx.dir.path;

	p.log.success("Created theme!");

	const nodePackageManager = utils.getNodePackageManager();

	const shouldInitGit = await p.confirm({
		message: "Would you like to init a Git repo?",
	});

	if (p.isCancel(shouldInitGit)) {
		cancel();
	}

	if (shouldInitGit) {
		// init a git repo in the destination
		await initGit(dest);
	}

	const shouldInstallDeps = await p.confirm({
		message: `Install dependencies with ${nodePackageManager}?`,
	});

	if (p.isCancel(shouldInstallDeps)) {
		cancel();
	}

	// install node modules with user's package manager in the destination
	if (shouldInstallDeps) {
		const spinner = p.spinner();

		try {
			spinner.start("Installing dependencies...");

			await utils.installNodeModules(nodePackageManager, {
				cwd: dest,
			});

			spinner.stop("Successfully installed dependencies");
		} catch {
			spinner.stop("Failed to install dependencies, skipping");
		}
	}

	// log next steps

	const themeDir = path.relative(process.cwd(), dest);

	p.outro("All done!");

	console.log("Next steps:");

	console.log(`  cd ${themeDir}`);

	if (!shouldInstallDeps) {
		console.log(`  ${nodePackageManager} install`);
	}

	console.log(`  ${nodePackageManager} run watch`);
}
