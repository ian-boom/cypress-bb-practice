
describe('template spec', () => {
    it('passes', () => {
        // generate a random number between 30000 and 240000
        const randomNumber = Math.floor(Math.random() * (240000 - 30000 + 1)) + 30000;
        cy.visit('https://example.cypress.io');
        cy.wait(randomNumber);
    });
});
