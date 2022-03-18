/*! For license information please see main.7edf350e.js.LICENSE.txt */
"use strict";
(self.webpackChunkshaking_myself = self.webpackChunkshaking_myself || []).push([
  ["main"],
  {
    "./src/child.ts": (e, s, r) => {
      r.d(s, { func0: () => c });
      const c = () => 0;
    },
    "./src/index.ts": (e, s, r) => {
      var c = r("./src/child.ts");
      console.log((0, c.func0)(), "foo===");
    },
  },
  (e) => {
    var s = (s) => e((e.s = s));
    e.O(
      0,
      [
        "vendors-node_modules_pnpm_registry_npmmirror_com_webpack-dev-server_4_7_4_webpack-cli_4_9_2_w-31b0ca",
      ],
      () => (
        s(
          "./node_modules/.pnpm/registry.npmmirror.com+webpack-dev-server@4.7.4_webpack-cli@4.9.2+webpack@5.70.0/node_modules/webpack-dev-server/client/index.js?protocol=ws%3A&hostname=0.0.0.0&port=8081&pathname=%2Fws&logging=info&reconnect=10"
        ),
        s(
          "./node_modules/.pnpm/registry.npmmirror.com+webpack@5.70.0_webpack-cli@4.9.2/node_modules/webpack/hot/dev-server.js"
        ),
        s("./src/index.ts")
      )
    );
    e.O();
  },
]);
