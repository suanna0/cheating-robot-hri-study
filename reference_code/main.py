import random


def play_game():
    choices = ["rock", "paper", "scissors"]

    print("Rock Paper Scissors!")
    print("-" * 20)

    while True:
        user_input = input("\nEnter rock, paper, or scissors (or 'quit' to exit): ").lower().strip()

        if user_input == "quit":
            print("Thanks for playing!")
            break

        if user_input not in choices:
            print("Invalid choice. Please try again.")
            continue

        computer_choice = random.choice(choices)
        print(f"Computer chose: {computer_choice}")

        if user_input == computer_choice:
            print("It's a tie!")
        elif (
            (user_input == "rock" and computer_choice == "scissors") or
            (user_input == "paper" and computer_choice == "rock") or
            (user_input == "scissors" and computer_choice == "paper")
        ):
            print("You win!")
        else:
            print("You lose!")


if __name__ == "__main__":
    play_game()
