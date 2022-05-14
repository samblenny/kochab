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
   rsync -rpt 'me@debian:the-repo/*' ~/github/the-repo
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

2. Install Node:
   ```
   snap info node
   sudo snap install --classic node
   node -v
   ```

To do updates on the Debian box, run:
```
sudo apt update && sudo apt upgrade && sudo snap refresh
```
