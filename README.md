# kochab

A web app experiment using Vercel serverless functions for deployment and
Node.js on Debian for local development.


## Running the local dev server

The `src/server.ts` module provides a local dev approximation of the static
file and serverless function features of Vercel.

To use it:

1. Initial setup: clone repo and run `yarn install`

2. `yarn build`  (compile `src/server.ts` and `api/*.ts` to js in `build/`)

3. `yarn start`  (run HTTP server on port 8000 of all interfaces)


## Configuring API keys


### NASA_API_KEY Environment Variable

To configure the NASA API key in Vercel:

1. Get API key from https://api.nasa.gov/index.html

2. Log into Vercel and select the project for this repo

3. In the Vercel control panel, on the tab selector line near the top left
   (look for "Overview  Deployments  Analytics Settings"), pick "Settings".

4. On the left sidebar, select "Environment Variables".

5. In the main content area, in the "Add New" form, fill in:
   - NAME: NASA_API_KEY
   - VALUE: your-actual-api-key
   - ENVIRONMENT: leave the boxes for "Production" and "Preview" checked, but
     uncheck the box for "Development"

6. Click the "Add" button.

That takes care of the API key for the deployed web app, but we still need to
provide for setting up the environment variable for local dev on Debian.
There are plenty of options.

An easy way is to add `export NASA_API_KEY=...` to `~/.profile`, `~/.bashrc`,
or wherever you normally define environment variables.


### Concerning old deployments

Previews of old deployments hang around on Vercel unless you manually delete
them. This means there are potential issues with old code -- which may be
outdated, insecure, or otherwise troublesome -- using its API keys to access
resources long after that code has seemingly been replaced by newer
deployments.

I originally though it might be possible to disable API access by old previews
by changing an environment variable. But, it turns out I was wrong about that.
According to https://vercel.com/docs/concepts/projects/environment-variables,
the environment variables get baked into a deployment. Changes to environment
variables only affect new deployments. So, unless you want to revoke and
re-issue API keys frequently, the best way to prevent unintended API actions
getting taken by old previews is probably to manually delete them in the Vercel
dashboard.


## Workflow to edit, test, and deploy

This procedure was developed and tested for a primary dev workstation running
macOS, paired with a headless Debian 11 (Bullseye) dev system accessed over
SSH. The Debian system can be a VM, laptop, thin client, old PC under a desk,
or whatever.

A key motivating idea for this approach is that NPM packages have a very bad
recent track record for developer-credential stealing malware. So, the Debian
box, which will be running Node, does not have important keys on it.

How this works:

1. The Mac has SSH keys for a shell account on the Debian box and push rights
   to the code repo on GitHub. On the Debian box, `~/.ssh/authorized_keys` has
   the Mac's public key. The Mac and Debian box are preferably connected by
   Ethernet (if Debian is not a VM), but a solid wifi link also works.

2. The Debian box has a clone of the code repo using the https remote URL
   method. That means it can do `git pull` but not `git push`. The Debian box
   can accidentally run packages and dev tools that may attempt to steal its
   keys, but it won't matter, because there are no important keys to steal.

3. The Mac has a clone of the code repo using the SSH remote URL method, along
   with SSH keys that have push rights to GitHub.

   For working on private repos, instead of the Debian box pulling against an
   https remote, the Mac can add the Debian box as a second remote. In that
   scenario, the Mac can pull and push to both GitHub and the Debian box.
   It could work sorta like this:
   ```
   $ git remote add debian me@debian:private-repo
   $ git remote -v
   debian  me@debian:private-repo (fetch)
   debian  me@debian:private-repo (push)
   origin  git@github.com:my-org/private-repo.git (fetch)
   origin  git@github.com:my-org/private-repo.git (push)
   $ git pull origin
   $ git push debian
   ```

4. Code changes are edited on the Debian system over SSH, VNC, VM console
   access, or whatever. Code is tested by running it in Node on the Debian
   system.

5. In the case of a public repo, commits are staged through the Mac by syncing
   edits from the Debian box to the Mac with a shell script to invoke `rsync`
   like so:
   ```
   #!/bin/sh
   rsync -rpt --filter="- node_modules" 'me@debian:kochab/*' ~/code/kochab
   ```
   Once changes are pushed to GitHub, the Debian box can pull them with:
   ```
   git restore . && git clean -fd && git pull
   ```

   For working with private repos, where the Mac is set up with dual remotes,
   it would be possible to sync code from the Debian box to the Mac with
   `rsync`, or to use `git pull debian`, then `git push origin`. The `rsync`
   method could be useful, for example, to gpg sign commits with a key stored
   on the Mac.

6. Web app deployment happens automatically when the Mac pushes to GitHub due
   to the repo having been configured as a project in Vercel using the Vercel
   GitHub integration.

The advantage of using Debian on a physically separate computer is that it's a
simple way to get good isolation between dangerous npm packages and privileged
keys. Of course, it's only simple if you know how to set up a Debian box.


## Installing Node.js v16 with Snap

The Debian package for Node is too old. There are a variety of ways to install
a newer version. I chose to use snapd because I have more trust in sysadmin
tools from Debian and Canonical than in tools from the NPM ecosystem.

1. Install `snapd` on Debian:
   ```
   sudo apt install snapd
   # reboot or log out, then log back in
   sudo snap install core
   # wait... this may appear stuck for a few minutes, but be patient
   ```

2. Install Node on Debian:
   ```
   snap info node
   sudo snap install --classic node
   node -v
   ```

To see CLI tools installed with node, check `/snap/node/current/bin`.

To see modules installed with node, check `/snap/node/current/lib`.

To do apt and snap updates on the Debian, run:
```
sudo apt update && sudo apt upgrade && sudo snap refresh
```


## Configure Yarn and install Typescript

Yarn can be configured to use a package cache to enable offline workflows and
generally speed things up by reducing network requests.

Reference links:
- https://classic.yarnpkg.com/blog/2016/11/24/offline-mirror/
- https://yarnpkg.com/features/offline-cache

1. Configure yarn offline mirror on Debian (this is one-time, not per-project):
   ```
   yarn config set yarn-offline-mirror ./.yarn-offline-cache
   yarn config set yarn-offline-mirror-pruning true
   # check what yarn config did:
   less ~/.yarnrc
   ```
   This makes config changes in `~/.yarnrc` so that it becomes possible to use
   `yarn install --prefer-offline` and `yarn install --offline`. I've seen
   references to setting `install.prefer-offline true` with `yarn config`, but
   that does not seem to work (as verified with `yarn install --verbose`).

2. Add Typescript to project repo on Debian (when starting new project):
   ```
   # make sure .gitignore has a `node_modules/` line
   yarn add typescript --dev
   ```
   Alternately, it might work to do a one-time global install sorta like this:
   ```
   yarn global install typescript --dev
   ```
   I have not tested this. Would probably need to add a `$PATH` entry with the
   result of `yarn global bin` in order for it to work. For more info, see
   https://classic.yarnpkg.com/en/docs/cli/global

3. Alternately, to install Typescript in project when checking out an existing
   repo:
   ```
   yarn install --prefer-offline
   ```

4. To run the compiler:
   ```
   yarn tsc
   ```
   To see tsc options:
   ```
   yarn tsc --help
   ```


## Getting Typescript imports working for Node builtins

Typescript imports require type declarations. By default, Typescript includes
types packages that it finds in `node_modules/@types/`. So, to import from
node, we need `node_modules/@types/node/` to contain type declarations for
Node's built-in types. The easy way to get those is:
```
yarn add --dev @types/node
```
