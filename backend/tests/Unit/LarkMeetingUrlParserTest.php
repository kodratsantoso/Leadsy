<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\Lark\LarkMeetingUrlParser;

class LarkMeetingUrlParserTest extends TestCase
{
    public function test_it_parses_minute_token()
    {
        $url = 'https://vc.larksuite.com/minutes/obcn7m0x5544sxxxxxxxx?_lark_minute_token=token';
        $result = LarkMeetingUrlParser::parse($url);

        $this->assertTrue($result['valid']);
        $this->assertEquals('minuteToken', $result['type']);
        $this->assertEquals('obcn7m0x5544sxxxxxxxx', $result['id']);
    }

    public function test_it_parses_meeting_id()
    {
        $url = 'https://applink.larksuite.com/client/vc/meeting_detail?meetingId=743385739847293&title=Weekly+Sync';
        $result = LarkMeetingUrlParser::parse($url);

        $this->assertTrue($result['valid']);
        $this->assertEquals('meetingId', $result['type']);
        $this->assertEquals('743385739847293', $result['id']);
    }

    public function test_it_parses_regional_direct_join_url()
    {
        $url = 'https://vc-sg.larksuite.com/j/113975432';
        $result = LarkMeetingUrlParser::parse($url);

        $this->assertTrue($result['valid']);
        $this->assertEquals('meetingId', $result['type']);
        $this->assertEquals('113975432', $result['id']);
    }

    public function test_it_rejects_invalid_host()
    {
        $url = 'https://zoom.us/j/123456789';
        $result = LarkMeetingUrlParser::parse($url);

        $this->assertFalse($result['valid']);
        $this->assertEquals('UNSUPPORTED_LARK_HOST', $result['error']);
    }

    public function test_it_rejects_missing_meeting_id()
    {
        $url = 'https://applink.larksuite.com/client/vc/meeting_detail?title=Weekly+Sync';
        $result = LarkMeetingUrlParser::parse($url);

        $this->assertFalse($result['valid']);
        $this->assertEquals('MEETING_ID_NOT_FOUND', $result['error']);
    }
}
