Feature: Sign-In Data-Driven Validation Tests
  As a user
  I want to sign in with various email and password combinations
  So that I can verify validation behavior for different inputs

  Background:
    Given the Auth and User Services are reachable
    And I am on the sign-in page

  Scenario Outline: Sign in with various email and password combinations
    When I enter email as "<email>"
    And I enter password as "<password>"
    And I click the sign-in button
    Then I should see either success or error message for "<scenario>"
    And I should log the response status for "<scenario>"

    Examples:
      | scenario                        | email                  | password      |
      | Valid credentials               | reka15@gmail.com       | Reka@15NV     |
      | Incorrect email domain          | reka15@wrongdomain.com | Reka@15NV     |
      | Incorrect password              | reka15@gmail.com       | WrongPassword123 |
      | Both email and password wrong   | wrong@example.com      | WrongPass@123 |
      | Email without @ symbol          | reka15gmail.com        | Reka@15NV     |
      | Email with invalid format       | reka15@.com            | Reka@15NV     |
      | Password without special char   | reka15@gmail.com       | Reka15NV      |
      | Password less than 8 chars      | reka15@gmail.com       | Reka@1        |
      | Password more than 30 chars     | reka15@gmail.com       | Reka@15NVReka@15NVReka@15NVExtra |
      | Empty email                     | EMPTY                  | Reka@15NV     |
      | Empty password                  | reka15@gmail.com       | EMPTY         |
      | Email with spaces               |  reka15@gmail.com      | Reka@15NV     |
      | Only numbers password           | reka15@gmail.com       | 12345678      |
