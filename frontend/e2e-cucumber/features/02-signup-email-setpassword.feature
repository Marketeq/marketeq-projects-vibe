Feature: Talent Onboarding Experience - Email Signup with Password Setting
  As a new talent user
  I want to register with my email and complete the onboarding process
  So that I can set my password and access my dashboard
  And I can start looking for work in the marketeq platform

  Background:
    Given the Auth and User Services are reachable
    And avatar fixture image is available for talent onboarding

  Scenario: Complete email registration with 5-step onboarding and password setting
    Given I am on the "Sign Up" page
    When I enter a unique email and accept terms
    And I click "Create My Account" button on signup
    Then I should be redirected to "What brings you here today" screen after email signup
    When I select "I am looking for work" option
    And I upload avatar and enter my name
    And I enter my username
    And I enter my location and languages
    And I enter my professional details
    And I set my preferences and availability
    Then I should reach the success screen
    When I click "Go to Dashboard" on success screen
    Then I should see the "Secure your account" modal
    When I set password automatically in the modal
    And I close the password modal
    Then I should be on the talent dashboard
    When I logout from the dashboard
    And I am on the sign-in page and sign in with the registered email and password
    Then I should see the talent dashboard without the modal
    Then I should see a welcome message with my name, confirming successful login and onboarding completion
    And I should see my uploaded avatar image displayed on the dashboard, confirming successful onboarding and profile setup