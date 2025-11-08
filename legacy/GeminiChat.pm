# File: GeminiChat.pm
package GeminiChat;
use strict;
use warnings;
use JSON::PP qw(encode_json decode_json);
use HTTP::Tiny;
use parent 'Exporter';
our @EXPORT_OK = qw(gemini_reply);

# Simple function:
#   my $reply = gemini_reply("Hello there");
# Options:
#   model => "gemini-2.5-flash" (default), "gemini-2.5-pro", etc.
#   system => "You are a helpful assistant."
#   timeout => seconds (default 30)
sub gemini_reply {
    my ($user_text, %opt) = @_;
    
    # 1. API Key Check
    die "Set GEMINI_API_KEY env var first\n" unless $ENV{GEMINI_API_KEY};

    my $model   = $opt{model}   // 'gemini-2.5-flash';
    my $system  = $opt{system}  // undef;
    my $timeout = $opt{timeout} // 30;

    my $ua = HTTP::Tiny->new(
        default_headers => {
            # API Key is passed in the URL query, not the header
            'Content-Type'  => 'application/json',
        },
        timeout => $timeout,
    );
    
    ## 2. Request Payload Construction (Gemini format)
    
    # Use a temporary array to build the contents (message history)
    my @message_history;

    # Insert System Instruction as the first message if provided.
    # We use the 'user' role for the context-setting message to ensure compatibility.
    if (defined $system) {
        push @message_history, {
            role => "user", 
            parts => [ { text => $system } ]
        };
    }

    # Add the actual user message
    push @message_history, {
        role => "user",
        parts => [ { text => $user_text } ]
    };

    # The final payload contains the complete message history
    my $payload = {
        contents => \@message_history,
    };
    
    ## 3. Endpoint and HTTP Request

    # The official API endpoint
    my $endpoint_base = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent";

    # Append API Key as a Query Parameter (CRITICAL FIX)
    my $endpoint = "$endpoint_base?key=$ENV{GEMINI_API_KEY}";

    my $res = $ua->post(
        $endpoint,
        { content => encode_json($payload) }
    );

    # Error handling
    die "HTTP error: $res->{status} $res->{reason}\n$res->{content}\n"
        unless $res->{success};

    my $json = eval { decode_json($res->{content}) };
    die "Bad JSON from API\n$res->{content}\n" if $@ || !defined $json;

    ## 4. Response Parsing (Gemini format)
    # The reply text is found at: $json->{candidates}[0]->{content}->{parts}[0]->{text}
    if (ref($json->{candidates}) eq 'ARRAY' && @{$json->{candidates}}) {
        # Check for the expected structure before accessing it
        if (ref($json->{candidates}[0]->{content}->{parts}) eq 'ARRAY' && 
            ref($json->{candidates}[0]->{content}->{parts}[0]) eq 'HASH') {
            
            my $reply_text = $json->{candidates}[0]->{content}->{parts}[0]->{text};
            return $reply_text if defined $reply_text;
        }
    }

    # Last-resort: show the raw payload for debugging
    die "No text found in response.\n" . encode_json($json) . "\n";
}

1;
