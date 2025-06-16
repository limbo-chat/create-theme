import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import * as p from "@clack/prompts";
import * as utils from "poopgen/utils";

const boldWarning = chalk.bold.redBright.bold("Warning:");

/** @type{import("poopgen").BeforeFn} */
export async function before(ctx) {
	const result = await p.group(
		{
			name: () =>
				p.text({
					message: "What do you want to name your theme?",
					validate: (value) => {
						if (value.trim().length === 0) {
							return "Name is required";
						}
					},
				}),
		},
		{
			onCancel: () => {
				p.cancel("cancelled");
				process.exit(0);
			},
		}
	);

	const { dir, name, packageName } = utils.parseProjectName(result.name, ctx.dir.path);

	if (fs.existsSync(dir)) {
		if (fs.readdirSync(dir).length > 0) {
			console.log(
				`${boldWarning} ${chalk.red.bold(result.name)} already exists and is not empty, aborting`
			);

			process.exit(1);
		}
	}

	// set the output directory
	ctx.dir.path = dir;

	// set start millseconds for after generation
	ctx.data.startMS = Date.now();

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

	console.log(
		`\n${chalk.bold(chalk.red(ctx.data.theme.name))} ${`scaffolded successfully in ${Date.now() - ctx.data.startMS}ms!`} \n`
	);

	const nodePackageManager = utils.getNodePackageManager();

	const result = await p.group(
		{
			should_init_git: () =>
				p.confirm({
					message: "Initialize Git repo?",
				}),
			should_install_deps: () =>
				p.confirm({
					message: `Install dependencies with ${nodePackageManager}?`,
				}),
		},
		{
			onCancel: () => {
				p.cancel("cancelled");
				process.exit(0);
			},
		}
	);

	// init a git repo in the destination
	if (result.should_init_git) {
		await initGit(dest);
	}

	// install node modules with user's package manager in the destination
	if (result.should_install_deps) {
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

	console.log("\nNext steps:");

	if (process.cwd() !== dest) {
		console.log(chalk.italic(`  cd ${path.relative(process.cwd(), dest)}`));
	}

	if (!result.should_install_deps) {
		if (nodePackageManager === "yarn") {
			console.log(chalk.italic("  yarn"));
		} else {
			console.log(chalk.italic(`  ${nodePackageManager} install`));
		}
	}

	console.log(chalk.italic(`  ${nodePackageManager} run watch`));
}

// --- helpers ---

/**
 * @param {string} destPath
 */
async function initGit(destPath) {
	const spinner = p.spinner();

	const dirName = path.parse(destPath).name;

	spinner.start("Initializing git repository...");

	try {
		const destHasGitRepo = utils.dirHasGitRepo(destPath);
		const dirIsInsideGitRepo = await utils.dirIsInsideGitRepo(destPath);

		if (destHasGitRepo) {
			spinner.stop();

			const shouldOverwriteGit = await p.confirm({
				message: `${boldWarning} There is already a git repository. Initializing a new repository would delete the previous history. Would you like to continue?`,
				initialValue: false,
			});

			if (!shouldOverwriteGit) {
				spinner.message("Skipping git initialization.");

				return;
			}

			fs.rmSync(path.join(destPath, ".git"));
		} else if (dirIsInsideGitRepo) {
			spinner.stop();

			const shouldInitChildGitRepo = await p.confirm({
				message: `${boldWarning} "${dirName}" is already in a git worktree. Would you still like to initialize a new git repository in this directory?`,
				initialValue: false,
			});

			if (!shouldInitChildGitRepo) {
				spinner.message("Skipping git initialization");

				return;
			}
		}

		await utils.initGit({
			cwd: destPath,
		});

		spinner.stop("Successfully intialized git repository");
	} catch {
		spinner.stop("Failed to initialize git repository, skipping");
	}
}
