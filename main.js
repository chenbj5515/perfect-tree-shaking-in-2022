/*! For license information please see main.b7c9ab33.js.LICENSE.txt */
"use strict";
(self.webpackChunkshaking_myself = self.webpackChunkshaking_myself || []).push([
  ["main"],
  {
    "./src/index.ts": (e, s, o) => {
      var r = o(
        "./node_modules/.pnpm/registry.npmmirror.com+lodash@4.17.21/node_modules/lodash/lodash.js"
      );
      console.log((0, r.isEmpty)({}));
    },
  },
  (e) => {
    var s = (s) => e((e.s = s));
    e.O(
      0,
      [
        "vendors-node_modules_pnpm_registry_npmmirror_com_lodash_4_17_21_node_modules_lodash_lodash_js-457098",
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
