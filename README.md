# kochab

A web app experiment using Vercel serverless functions for deployment and
Node.js on Debian for local development.


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

3. Install Typescript in project repo on Debian:
   ```
   # make sure .gitignore has a `node_modules/` line
   yarn add typescript --dev
   ```
   To run the compiler:
   ```
   yarn tsc
   ```
   To see tsc options:
   ```
   yarn tsc --help
   ```

To see CLI tools installed with the snap, look in `/snap/node/current/bin`:
```
$ ls -glo --time-style=+ /snap/node/current/bin
total 85438
lrwxrwxrwx 1       45  corepack -> ../lib/node_modules/corepack/dist/corepack.js
-rwxr-xr-x 1 87483808  node
lrwxrwxrwx 1       38  npm -> ../lib/node_modules/npm/bin/npm-cli.js
lrwxrwxrwx 1       38  npx -> ../lib/node_modules/npm/bin/npx-cli.js
-rwxr-xr-x 1     1025  yarn
-rwxr-xr-x 1       34  yarn.cmd
-rwxr-xr-x 1     1015  yarn.js
-rwxr-xr-x 1       42  yarnpkg
-rwxr-xr-x 1       30  yarnpkg.cmd
```

To see modules installed with the snap, look in `/snap/node/current/lib`:
```
cd /snap/node/current/lib/node_modules/npm/node_modules
less builtins/builtins.json
find | less
```

To do apt and snap updates on the Debian, run:
```
sudo apt update && sudo apt upgrade && sudo snap refresh
```


## Configuring API keys in Vercel


### NASA API key

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
provide for setting up the environment variable for local dev on the Debian.
For Debian, there are plenty of options. For example:

1. Lazy way: add `EXPORT NASA_API_KEY=...` to `~/.profile`, preferably using an
   API key that is not the production key

2. Paranoid way: (makes it moderately more difficult for the API key to be
   exfiltrated from the Debian box since it's not saved in `.profile`). Make a
   script on the Mac like this:
   ```
   #!/bin/sh
   ssh me@debian 'NASA_API_KEY=...; cd ~/kochab; /snap/bin/node dev-app.mjs'
   ```
   Then, run that script from the Mac to start the web app in Node on Debian.
   Note that this may leave node running on the Debian box even after you end
   the SSH session with control-c. Not sure yet how to prevent that.
