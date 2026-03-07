Feature: Talent Profile Completion & Avatar Verification
  As a new user
  I want to register with my Google account and complete the onboarding process
  And I can start looking for work in the marketeq platform
  and my professional identity is correctly displayed on my dashboard

  Background:
    Given the Auth and User Services are reachable
    And avatar fixture image is available for talent onboarding

  Scenario: Completing onboarding and verifying avatar persistence on the dashboard
    Given I am on the "Sign Up" page
    Then I click sign by google button
    Then I see Pop up page opens for google sign in
    Then I enter username and password and submit the form
    Then I should be redirected to the "What brings you here today" screen
    When I choose "I am looking for work" on talent onboarding
    And I upload a physical image file (avatar.jpg) and save it
    Then I should see a preview of my avatar image immediately
    When I complete the 5-step onboarding (Name, Username, Location, Skills, and Preferences)
    And I click "Go to Dashboard"
    Then I should be redirected to the /talent-dashboard
    And I click logout and i am in sign-in page and again i sign-in by google
    And I am directly naviagetd to Talent-dashabord as signup by google is done
    Then I should see a welcome message with my name, confirming successful login and onboarding completion
    And I should see my uploaded avatar image displayed on the dashboard, confirming successful onboarding and profile setup
   