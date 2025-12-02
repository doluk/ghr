#!/usr/bin/perl

use strict;
use warnings;
use Getopt::Long;
use Pod::Usage;

# --- Default Values ---
my $state_flag = 'open';
my $repo_arg = '';
my $reviewer_arg = '@me';
my $help;
my $limit = 100; # Add a reasonable default limit

# --- Process Command Line Arguments ---
GetOptions(
    'help'         => \$help,
    'state=s'      => \$state_flag,
    'repo=s'       => \$repo_arg,
    'reviewer=s'   => \$reviewer_arg,
    'limit=i'      => \$limit,
    ) or pod2usage(2);

pod2usage(1) if $help;

# --- Build the gh Command ---

my $command = 'gh search prs ';

# 1. State/Filter Argument
if (lc($state_flag) ne 'any') {
    $command .= "--state $state_flag ";
}

# 2. Reviewer Argument (Required)
$command .= "--review-requested \"$reviewer_arg\" ";

# 3. Repository Argument (Optional)
if ($repo_arg) {
    # The 'repo:' qualifier is used in the search string for multi-repo searches
    # If the user provides an argument to --repo, we use the specific -R flag which is better
    # for single repos, or we add the qualifier if the user provided multiple repos.
    # The simplest is to use the query argument:
    $command .= "repo:$repo_arg ";
}

# 4. JSON output and jq command (Required)
# Use a high limit for comprehensive results
$command .= "--limit $limit ";
$command .= "--json title,url,repository ";
# The jq expression is modified to remove the parenthesis around the URL.
$command .= "--jq '.[] | \"- \" + .repository.name + \": \" + .title + \" \" + .url' ";

# --- Execute and Post-Process ---

# Execute the gh command
my $output = `$command`;

# Check for errors from gh command execution
if ($?) {
    print STDERR "Error executing GitHub CLI command:\n$command\n";
    print STDERR $output;
    exit 1;
}

# The jq command already does most of the formatting, including removing the parenthesis
# around the URL as requested by your example.
print $output;

# --- Pod Documentation (for --help) ---
__END__

=head1 NAME

gh_my_reviews.pl - List GitHub PRs requested for review across multiple repositories using the GitHub CLI.

=head1 SYNOPSIS

gh_my_reviews.pl [options]

=head1 OPTIONS

=over 8

=item B<--help>

Display this help message.

=item B<--state> I<arg>

Specify the state of the Pull Requests. Defaults to 'open'.
Use 'closed' or 'merged' for other states. Use 'any' to remove the state restriction entirely.

=item B<--repo> I<arg>

Restrict the search to a specific repository or organization (e.g., 'owner/repo' or 'owner/*').

=item B<--reviewer> I<arg>

Specify the requested reviewer. Defaults to '@me' (the current authenticated user).
Can be a username (e.g., 'johndoe').

=item B<--limit> I<arg>

Specify the maximum number of results to fetch. Defaults to 100.

=back

=head1 DESCRIPTION

This script is a wrapper around the GitHub CLI's 'gh search prs' command. It simplifies the process of finding Pull Requests across multiple repositories where your review was requested.

=head1 EXAMPLE

 gh_my_reviews.pl
 gh_my_reviews.pl --state closed
 gh_my_reviews.pl --repo 'my-org/*'
 gh_my_reviews.pl --reviewer 'team/dev-team' --state any

=cut
