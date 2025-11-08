package GeminiConverse;
use strict;
use warnings;
use JSON::PP qw(encode_json decode_json);
use HTTP::Tiny;
use parent 'Exporter';

our @EXPORT_OK = qw(new reply get_history);

# --- Session Object Structure ---
sub new {
    my ($class, %opt) = @_;
    
    # 1. API Key Check
    my $api_key = $ENV{GEMINI_API_KEY};
    die "FATAL: Set GEMINI_API_KEY environment variable first\n" unless $api_key;

    # The history now starts empty, the system prompt is stored separately.
    my @history = ();
    my $system_instruction = $opt{system} // undef; 

    # 2. Object Construction
    my $self = {
        _history     => \@history,
        _model       => $opt{model} // 'gemini-2.5-flash',
        _timeout     => $opt{timeout} // 30,
        _api_key     => $api_key,
        _temperature => $opt{temperature} // 0.9, 
        _system_instruction => $system_instruction, # NEW: Store system instruction here
    };
    
    # Ensure temperature is valid
    $self->{_temperature} = $self->{_temperature} > 1.0 ? 1.0 : $self->{_temperature};
    $self->{_temperature} = $self->{_temperature} < 0.0 ? 0.0 : $self->{_temperature};
    
    return bless $self, $class;
}

# --- Main Conversational Reply Method ---
sub reply {
    my ($self, $user_text) = @_;
    
    # 1. Add the new user query to the history (memory)
    my $new_user_message = {
        role => "user",
        parts => [ { text => $user_text } ]
    };
    push @{$self->{_history}}, $new_user_message;
    
    # 2. Setup HTTP client and endpoint
    my $ua = HTTP::Tiny->new(
        default_headers => {
            'Content-Type'  => 'application/json',
        },
        timeout => $self->{_timeout},
    );
    
    # 3. Request Payload Construction
    my $payload = {
        contents => $self->{_history}, # Full history is passed here
        generationConfig => {
            temperature => $self->{_temperature},
        },
    };
    
    # NEW: Conditionally add the systemInstruction to the payload
    if (defined $self->{_system_instruction}) {
        $payload->{systemInstruction} = {
            parts => [{ text => $self->{_system_instruction} }]
        };
    }
    
    # 4. Endpoint and HTTP Request
    my $endpoint_base = "https://generativelanguage.googleapis.com/v1beta/models/$self->{_model}:generateContent";
    my $endpoint = "$endpoint_base?key=$self->{_api_key}";

    # DEBUG: API URL print line removed as 404 is solved.

    my $res = $ua->post(
        $endpoint,
        { content => encode_json($payload) }
    );

    die "HTTP error: $res->{status} $res->{reason}\n$res->{content}\n"
        unless $res->{success};

    my $json = eval { decode_json($res->{content}) };
    die "Bad JSON from API\n$res->{content}\n" if $@ || !defined $json;

    # 5. Response Parsing
    my $reply_text = "No text found in response.";
    
    # Check if a candidate exists and has text parts
    if (ref($json->{candidates}) eq 'ARRAY' && @{$json->{candidates}} && 
        $json->{candidates}[0]->{content} && 
        ref($json->{candidates}[0]->{content}->{parts}) eq 'ARRAY' && 
        $json->{candidates}[0]->{content}->{parts}[0] && 
        ref($json->{candidates}[0]->{content}->{parts}[0]) eq 'HASH') {
            
        $reply_text = $json->{candidates}[0]->{content}->{parts}[0]->{text} // "No text part found.";
    }
    
    # 6. Add the model's reply to the history for the next turn
    push @{$self->{_history}}, {
        role => "model",
        parts => [ { text => $reply_text } ]
    };

    return $reply_text;
}

sub get_history {
    my $self = shift;
    return $self->{_history};
}

1;
