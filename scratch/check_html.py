import html.parser
import sys

class HTMLTagChecker(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        # void elements do not have closing tags
        void_elements = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
                         'link', 'meta', 'param', 'source', 'track', 'wbr'}
        if tag not in void_elements:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        void_elements = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
                         'link', 'meta', 'param', 'source', 'track', 'wbr'}
        if tag in void_elements:
            return
        if not self.stack:
            self.errors.append(f"Unexpected closing tag </{tag}> at line {self.getpos()[0]}, col {self.getpos()[1]}")
            return
        
        expected, pos = self.stack.pop()
        if expected != tag:
            # Maybe self-closing or missing tag, but let's report mismatch
            self.errors.append(f"Tag mismatch: expected </{expected}> (opened at line {pos[0]}), found </{tag}> at line {self.getpos()[0]}")
            # Put expected back or handle it, but simple mismatch is enough to check
            # We will pop until we find a match or keep it
            
def check_file(path):
    print(f"\nChecking: {path}")
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    checker = HTMLTagChecker()
    checker.feed(content)
    
    if checker.stack:
        print("Unclosed tags remaining:")
        for tag, pos in reversed(checker.stack):
            print(f"  <{tag}> opened at line {pos[0]}, col {pos[1]}")
    else:
        print("No unclosed tags (except mismatch handling if any).")
        
    if checker.errors:
        print("Mismatches/Errors:")
        for err in checker.errors:
            print(f"  {err}")

if __name__ == '__main__':
    check_file('index.html')
    check_file('public/index.html')
