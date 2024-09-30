const { faker } = require('@faker-js/faker');

describe('Login Tests', () => {
    /* Function Definitions */
    let presets = (seller) => {
        cy.visitPage('/login', !seller);
        cy.get('fieldset').eq(0).as('email');
        cy.get('fieldset').eq(1).as('password');
        cy.get('[data-testname="login-form"]').as('loginForm');
    };

    let redirectValidator = (searchTerm, urlValue) => {
        cy.contains(searchTerm).click();
        cy.location().should((loc) => {
            expect(loc.href).to.eq(urlValue);
        });
    };

    let generator = (type, amount) => {
        let generatedList = [];
        for (let i = 0; i < amount; i++) {
            switch (type) {
                case 0:
                    generatedList.push(faker.internet.password());
                    break;
                case 1:
                    generatedList.push(faker.internet.email());
                    break;
                case 2:
                    generatedList.push({
                        'email' : faker.internet.email(),
                        'password' : faker.internet.password()
                    });
                    break;
            };
        };
        return generatedList;
    };

    let tryLogin = (values, alias, email = null) => {
        cy.get('@loginForm').within(() => {
            values.forEach((value) => {
                const inputEmail = email ? email : value.email;
                const inputPassword = email ? value : value.password;
                const errorMessage = email ? 'INVALID_PASSWORD' : 'EMAIL_NOT_FOUND';
                cy.get('@email').find('input').type(inputEmail);
                cy.get('@password').find('input').type(inputPassword);
                cy.document().find('[data-notify="container"]').should('not.exist');
                cy.get('[data-testid="manual-login-btn"').click();
                cy.wait(500);
                cy.document().find('[data-notify="container"]').should('exist');

                cy.wait(`@${alias}`).then((intercept) => {
                    expect(intercept.request.body.email).to.eq(inputEmail.toLowerCase());
                    expect(intercept.request.body.password).to.eq(inputPassword);
                    expect(intercept.response.statusCode).to.eq(400);
                    expect(intercept.response.statusMessage).to.eq('Bad Request');
                    expect(intercept.response.body.error.message).to.eq(errorMessage);
                });

                cy.get('@email').find('input').clear();
                cy.get('@password').find('input').clear();
                cy.wait(4000);
            });
        });
    };

    let bothCredetntialsTest = () => {
        cy.get('@loginForm').within(() => {
            cy.get('@email').should('not.contain.text', 'Email is required.');
            cy.get('@password').should('not.contain.text', 'Password is required.');
            cy.get('[data-testid="manual-login-btn"').click();
            cy.get('@email').should('not.text', 'Email is required.');
            cy.get('@password').should('not.text', 'Password is required.');
        })
    };

    let missingEmailCredentialTest = () => {
        const randomPasswords = generator(0, 10);
        cy.get('@loginForm').within(() => {
            randomPasswords.forEach((password) => {
                cy.get('@password').find('input').clear();
                cy.get('@password').find('input').type(password);
                cy.get('[data-testid="manual-login-btn"').click();
                cy.get('@email').should('not.text', 'Email is required.');
            });
        })
    };

    let missingPasswordCredentialTest = () => {
        const randomEmails = generator(1, 10);
        cy.get('@loginForm').within(() => {
            randomEmails.forEach((email) => {
                cy.get('@email').find('input').clear();
                cy.get('@email').find('input').type(email);
                cy.get('[data-testid="manual-login-btn"').click();
                cy.get('@password').should('not.text', 'Password is required.');
            });
        })
    };

    let invalidEmailTest = () => {
        // Generate a valid email
        const validEmail = faker.internet.email();

        // Examples of invalid email formats:
        const invalidEmails = [
            validEmail.replace(/@/g, ''),             // Remove '@' symbol
            validEmail.replace(/\./g, ''),             // Remove '.' from the domain
            validEmail.replace(/@.+/, '@'),          // Remove domain part
            validEmail + '@',                        // Add an extra '@' symbol
            validEmail.split('@')[0],                // Missing domain part
            faker.internet.userName(),               // Just a username, no '@' and domain
        ];

        cy.get('@loginForm').within(() => {
            invalidEmails.forEach((email) => {
                cy.get('@email').should('not.contain.text', 'Not a valid email address');
                cy.get('@email').find('input').type(`${email}`);
                cy.get('@email').find('legend').click();
                cy.wait(2000);
                cy.get('@email').should('contain.text', 'Not a valid email address');
                cy.get('@email').find('input').clear()
                cy.get('@email').should('not.contain.text', 'Email is required.');
                cy.get('@email').find('legend').click();
                cy.wait(2000);
                cy.get('@email').should('contain.text', 'Email is required.');
            })
        })
    };

    let invalidEmailFromLengthTest = () => {
        const invalidEmails = [
            `${'boomsite'.repeat(8)}a@example.com`,                                                       // local portion exceeds 64 characters
            `example@${'b'.repeat(64)}.com`,                                                              // domain contains more than 63 characters for characters before '.' character
            `example@${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`,        // domain contains more than 252 characters 
        ];

        cy.get('@loginForm').within(() => {
            invalidEmails.forEach((email) => {
                cy.get('@email').should('not.contain.text', 'Not a valid email address');
                cy.get('@email').find('input').type(`${email}`);
                cy.get('@email').find('legend').click();
                cy.get('@email').should('contain.text', 'Not a valid email address');
                cy.get('@email').find('input').clear()
                cy.get('@email').should('not.contain.text', 'Email is required.');
                cy.get('@email').find('legend').click();
                cy.get('@email').should('contain.text', 'Email is required.');
            })
        })
    }

    const unregisteredLoginTest = (alias) => {
        const invalidAccounts = generator(2, 10);

        tryLogin(invalidAccounts, alias);
    };

    const incorrectPasswordTest = (alias, validEmail) => {
        const invalidPasswords = generator(0, 2);

        tryLogin(invalidPasswords, alias, validEmail);
    };

    const validLogin = (acc) => {
        cy.fixture('users').then((value) => {
            let accounts = acc ? value.buyers : value.sellers;
            accounts.forEach((account) => {
                cy.get('@loginForm').within(() => {
                    cy.get('@email').find('input').type(account.email);
                    cy.get('@password').find('input').type(account.password);
                    cy.get('[data-testid="manual-login-btn"').click();
                });

                cy.wait(6000);

                let pathName = acc ? /app$/ : /\/(visitors|welcome)$/;

                cy.location('pathname').should('match', pathName);

                cy.visitPage('/login?out', acc);

                cy.wait(6000);

                cy.get('@email').find('input').clear();
                cy.get('@password').find('input').clear();
            });
        });
    };

    describe('Buyer Login Testcases', () => {
        let interceptAlias = 'buyerLoginValdation';

        beforeEach(() => {
            presets(false);
            cy.intercept('POST', 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyC2-Lg8UR1Ce5An7YV7BZigyiEG_JyFXLo').as(interceptAlias);
        });

        /* Test Cases */
        // Unhappy Paths
        it('Should show error prompts saying email/password is required for buyer login', ()=> {
            bothCredetntialsTest();
        });

        it('Should show error prompts saying email is required for buyer login', ()=> {
            missingEmailCredentialTest();
        });

        it('Should show error prompts saying password is required for buyer login', () => {
            missingPasswordCredentialTest();
        });

        it('Should show error prompt stating email is not valid for buyer login', () => {
            invalidEmailTest();
        });

        it('Should show error prompt stating email is not valid if it exceeds certain amount of characters for buyer lgoins', () => {
            invalidEmailFromLengthTest();
        });

        it('Should show an error when logging in with an unregistered account for buyer logins', () => {
            unregisteredLoginTest(interceptAlias);
        });

        it('Should show an error when logging in with a registered account but wrong password for buyer logins', () => {
            incorrectPasswordTest(interceptAlias, 'bbkurtisrael@gmail.com');    
        });

        // Happy Paths
        it('Should login successfuly and direct to the buyer home screen for buyer logins', () => {
            validLogin(true);
        });

        it('Should redirect to the seller login page', () => {
            redirectValidator('Seller Sign In', 'https://manage.brandboom.us/login');
        });

        it("Should redirect to the Buyer's signup page", () => {
            redirectValidator('Sign Up', 'https://www.brandboom.us/buyer/signup');
        });

        it("Should redirect to the forgot password page", () => {
            redirectValidator('Forgot password?', 'https://www.brandboom.us/account/forgotPassword.php?scope=bc');
        });

        it.skip("Should open a google pop up window when google signin is clicked", () => {
            // Simulate clicking the "Login with Google" button
            cy.get('.google-login-btn').click();

            cy.get('iframe').should('have.attr', 'src').and('contain', 'https://login.brandboom.us/__/auth/iframe?apiKey=AIzaSyC2-Lg8UR1Ce5An7YV7BZigyiEG_JyFXLo&appName=%5BDEFAULT%5D&v=9.23.0&eid=p&usegapi=');
        });
    })

    describe('Seller Login Testcases', () => {
        let interceptAlias = 'buyerLoginValdation';

        beforeEach(() => {
            presets(true);
            cy.intercept('POST', 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyC2-Lg8UR1Ce5An7YV7BZigyiEG_JyFXLo').as(interceptAlias);
        });

        it('Should show error prompts saying email/password is required for seller login', ()=> {
            bothCredetntialsTest();
        });

        it('Should show error prompts saying email is required for seller login', ()=> {
            missingEmailCredentialTest();
        });

        it('Should show error prompts saying password is required for seller login', () => {
            missingPasswordCredentialTest();
        });

        it('Should show error prompt stating email is not valid for seller login', () => {
            invalidEmailTest();
        });

        it('Should show error prompt stating email is not valid if it exceeds certain amount of characters for seller logins', () => {
            invalidEmailFromLengthTest();
        });

        it('Should show an error when logging in with an unregistered account for seller logins', () => {
            unregisteredLoginTest(interceptAlias);
        });

        it('Should show an error when logging in with a registered account but wrong password for buyer logins', () => {
            incorrectPasswordTest(interceptAlias, 'ian.tester.dev@gmail.com');    
        });

        // Happy Paths
        it('Should login successfuly and direct to the buyer home screen for seller logins', () => {
            validLogin(false);
        });

        it('Should redirect to the buyer login page', () => {
            redirectValidator('Buyer Sign In', 'https://www.brandboom.us/login');
        });

        it("Should redirect to the Seller's signup page", () => {
            redirectValidator('Sign Up', 'https://www.brandboom.us/signup');
        });

        it("Should redirect to the forgot password page", () => {
            redirectValidator('Forgot password?', 'https://www.brandboom.us/account/forgotPassword.php?scope=cms');
        });
    })

    describe('Admin Login Testcases', () => {
        beforeEach(() => {
        });

        const loginQuery = (email, password, succesfulLogin, buyer) => {
            cy.get('@loginForm').within(() => {
                cy.get('@email').find('input').type(email);
                cy.get('@password').find('input').type(password);
                cy.document().find('[data-notify="container"]').should('not.exist');
                cy.get('[data-testid="manual-login-btn"').click();
                cy.wait(500);
                succesfulLogin ? cy.location('pathname').should('eq', buyer ? '/app' : '/visitors') : cy.document().find('[data-notify="container"]').should('exist');
            });
        };

        const adminLogins = (email, password, succesfulLogin, email2 = null) => {
            presets(false);

            loginQuery(email, password, succesfulLogin, true);

            cy.visitPage('/login', false);

            loginQuery(email2? email2 : email, password, succesfulLogin, false);
        };

        it('Should not login when using the admin way of shadowing an account "<admin>:<user>" if the account is not an admin', () => {
            let invalidCombination = 'ian.tester.dev@gmail.com:ian.quality.test@gmail.com';
            let genericPassword = 'Boom1234!';

            adminLogins(invalidCombination, genericPassword, false);
        });

        it('Should not login when using the admin way of shadowing an account "<admin>:<user>" if the user account is not registered', () => {
            let invalidCombination = 'ian@brandboom.com:example@example.com';
            let genericPassword = 'Boom1234!';

            adminLogins(invalidCombination, genericPassword, false);
        });

        it('Should not login when using the admin way of shadowing an account "<admin>:<user>" if the admin password is incorrect', () => {
            let invalidCombination = 'ian@brandboom.com:ian.tester.dev@gmail.com';
            let invalidCombination2 = 'ian@brandboom.com:bbkurtisrael@gmail.com';
            let genericPassword = 'InvalidPassword123!';

            adminLogins(invalidCombination, genericPassword, false, invalidCombination2);
        });

        it('Should login when using the admin way of shadowing an account "<admin>:<user>" if the admin credentials are correct and user account is registered', () => {
            let bueyerAccount = 'ian@brandboom.com:bbkurtisrael@gmail.com';
            let sellerAccount = 'ian@brandboom.com:ian.tester.dev@gmail.com';
            let genericPassword = 'Boom1234!';

            adminLogins(bueyerAccount, genericPassword, true, sellerAccount);
        });
    })
})
