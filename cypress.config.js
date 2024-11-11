const { defineConfig } = require("cypress");

module.exports = defineConfig({
    e2e: {
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
        experimentalStudio: true,
    },
    env: {
        buyerBaseUrl: 'www.brandboom.us',
        sellerBaseUrl: 'manage.brandboom.us'
    },
    projectId: "y7p2z9",
});
