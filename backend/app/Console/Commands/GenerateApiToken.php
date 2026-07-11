<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class GenerateApiToken extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'integration:generate-token {email} {--name=Integration_Token}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate a long-lived Bearer API token for external integrations (e.g. Lark Base) tied to the specified user email.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $tokenName = $this->option('name');

        $user = \App\Models\User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email '{$email}' not found.");
            return 1;
        }

        $token = $user->createToken($tokenName);

        $this->info("Successfully generated Bearer token for {$user->name} ({$email}).");
        $this->warn("Make sure to copy the token below now. You won't be able to see it again!");
        $this->line("");
        $this->line("<fg=green;options=bold>Token:</> {$token->plainTextToken}");
        $this->line("");
        $this->info("Use this token in your Authorization header:");
        $this->line("Authorization: Bearer {$token->plainTextToken}");
        
        return 0;
    }
}
