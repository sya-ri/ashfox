'use strict';

const cliIdentity = (fork = false) => Object.freeze(fork ? {
  name: 'sya-ri-ashfox',
  command: 'sya-ri-ashfox',
  repository: 'https://github.com/sya-ri/ashfox.git',
  guide: 'https://raw.githubusercontent.com/sya-ri/ashfox/main/docs/fork-agent.md',
  readme: 'docs/fork-agent.md',
  archive: 'sya-ri-ashfox-cli.tgz'
} : {
  name: '@ashfox/cli',
  command: 'ashfox',
  repository: 'https://github.com/sigee-min/ashfox.git',
  guide: 'https://ashfox.io/docs/guides/cli/',
  readme: 'apps/cli/README.md',
  archive: 'ashfox-cli.tgz'
});

module.exports = { cliIdentity };
