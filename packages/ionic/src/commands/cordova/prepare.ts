import chalk from 'chalk';

import { CommandMetadataOption } from '@ionic/cli-framework';
import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { filterArgumentsForCordova, generateBuildOptions } from '@ionic/cli-utils/lib/integrations/cordova/utils';

import { CordovaCommand } from './base';

export class PrepareCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    const options: CommandMetadataOption[] = [
      {
        name: 'build',
        summary: 'Do not invoke an Ionic build',
        type: Boolean,
        default: true,
      },
    ];

    const runner = this.project && await this.project.getBuildRunner();

    if (runner) {
      const libmetadata = await runner.getCommandMetadata();
      options.push(...libmetadata.options || []);
    }

    return {
      name: 'prepare',
      type: 'project',
      summary: 'Copies assets to Cordova platforms, preparing them for native builds',
      description: `
${chalk.green('ionic cordova prepare')} will do the following:

- Perform an Ionic build, which compiles web assets to ${chalk.bold('www/')}.
- Copy the ${chalk.bold('www/')} directory into your Cordova platforms.
- Transform ${chalk.bold('config.xml')} into platform-specific manifest files.
- Copy icons and splash screens from ${chalk.bold('resources/')} to into your Cordova platforms.
- Copy plugin files into specified platforms.

You may wish to use ${chalk.green('ionic cordova prepare')} if you run your project with Android Studio or Xcode.
      `,
      exampleCommands: ['', 'ios', 'android'],
      inputs: [
        {
          name: 'platform',
          summary: `The platform you would like to prepare (e.g. ${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
        },
      ],
      options,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { getPlatforms, installPlatform } = await import('@ionic/cli-utils/lib/integrations/cordova/project');

    const [ platform ] = inputs;

    if (!this.project) {
      throw new FatalException(`Cannot run ${chalk.green('ionic cordova prepare')} outside a project directory.`);
    }

    const cordova = await this.project.getIntegration('cordova');
    const platforms = await getPlatforms(cordova.root);

    if (platform) {
      if (!platforms.includes(platform)) {
        const confirm = await this.env.prompt({
          message: `Platform ${chalk.green(platform)} is not installed! Would you like to install it?`,
          type: 'confirm',
          name: 'confirm',
        });

        if (confirm) {
          await installPlatform(this.env, platform, cordova.root);
        } else {
          throw new FatalException(
            `Can't prepare for ${chalk.green(platform)} unless the platform is installed.\n` +
            `Did you mean just ${chalk.green('ionic cordova prepare')}?\n`
          );
        }
      }
    } else {
      if (platforms.length === 0) {
        this.env.log.warn(`No platforms installed. See ${chalk.green('ionic cordova platform add --help')} to add Cordova platforms.`);
        return;
      }
    }

    const metadata = await this.getMetadata();

    if (options.build) {
      const { build } = await import('@ionic/cli-utils/lib/build');
      const buildOptions = generateBuildOptions(metadata, inputs, options);

      if (buildOptions['platform']) {
        // TODO: use runner directly
        await build({ config: this.env.config, log: this.env.log, shell: this.env.shell, project: this.project }, inputs, buildOptions);
      } else {
        this.env.log.warn(
          `Cannot perform Ionic build without ${chalk.green('platform')}. Falling back to just ${chalk.green('cordova prepare')}.\n` +
          `Please supply a ${chalk.green('platform')} (e.g. ${['android', 'ios'].map(v => chalk.green(v)).join(', ')}) so the Ionic CLI can build web assets. The ${chalk.green('--no-build')} option can be specified to hide this warning.`
        );

        this.env.log.nl();
      }
    }

    await this.runCordova(filterArgumentsForCordova(metadata, options), {});
  }
}
