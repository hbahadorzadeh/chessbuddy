"""Build and inspect the public upload copy; never include private app bindings."""
import hashlib, io, json, pathlib, re, shutil, struct, urllib.request, urllib.parse, zipfile
import jsonschema

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "dist"
PACKAGE = OUT / "chessbuddy"
PACKAGE.mkdir(parents=True, exist_ok=True)
report = {"version": "0.6.0", "publisherDemoApproval": True, "assistantPlaybackVerified": False,
          "portalUploaded": False, "submitted": False, "inHostCasesRun": False, "checks": {}}

def check(condition, message):
    if not condition:
        raise AssertionError(message)

def https(value):
    check(isinstance(value, str), "URL must be text")
    parsed = urllib.parse.urlsplit(value)
    check(parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password,
          "Invalid HTTPS URL")
    return parsed

for name in ("plugin.json", "mcp.json"):
    shutil.copyfile(ROOT / "submission" / "chessbuddy" / name, PACKAGE / name)
(PACKAGE / "assets").mkdir(exist_ok=True)
shutil.copyfile(ROOT / "assets" / "chessbuddy-icon.png", PACKAGE / "assets" / "chessbuddy-icon.png")
manifest = json.loads((PACKAGE / "plugin.json").read_text())
mcp = json.loads((PACKAGE / "mcp.json").read_text())
check(manifest["$schema"] == "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", "Plugin schema")
check(mcp["$schema"] == "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json", "MCP schema")
check(manifest["name"] == "chessbuddy" and manifest["version"] == "0.6.0", "Identity/version")
check(re.fullmatch(r"\d+\.\d+\.\d+", manifest["version"]), "SemVer")
check(not any(k in manifest for k in ("apps", "skills", "mcpServers", "interface")), "Nonportable root field")
oa = manifest["extensions"]["com.openai"]
check("apps" not in oa, "Public upload cannot bind private apps")
ui, review, publication = oa["interface"], oa["review"], oa["publication"]
for key, limit in {"displayName":30, "shortDescription":30, "longDescription":4000, "developerName":80}.items():
    check(isinstance(ui[key], str) and 0 < len(ui[key]) <= limit, key + " length")
check(ui["developerName"] == "Hamed Bahadorzadeh", "Publisher")
check(ui["category"] in ["Business & Operations","Communication","Creativity","Data & Analytics","Developer Tools",
      "Education & Research","Entertainment","Finance","Healthcare","Other","Productivity",
      "Scientific Research","Security","Travel"], "Exact category title")
prompts = ui["defaultPrompt"]
check(isinstance(prompts, list) and 1 <= len(prompts) <= 3, "Default prompts")
check(len({" ".join(p.split()) for p in prompts}) == len(prompts), "Unique prompts")
check(all(isinstance(p,str) and p.strip() and len(p) <= 128 and "\n" not in p and "@" not in p for p in prompts), "Prompt format")
check(publication["countries"] == [], "All-country targeting")
check(isinstance(publication["release_notes"], str) and publication["release_notes"].strip(), "Release notes")
check(not re.search(r"\b(free|pricing|subscription|discount|promotion|purchase|purchases)\b", ui["longDescription"], re.I), "No pricing or promotional language in public description")
check(len(review["prompts"]) <= 20 and all(0 < len(p) <= 4000 for p in review["prompts"]), "Review prompts")
cases = review["test_cases"]
check(len(cases["positive"]) == 5 and len(cases["negative"]) == 3, "Five positive/three negative cases")
for kind in ("positive", "negative"):
    for case in cases[kind]:
        required = ("description", "prompt", "tools_triggered", "expected_behavior") if kind == "positive" else ("description", "prompt")
        check(all(isinstance(case.get(k),str) and case[k].strip() for k in required), "Case fields")
https(review["demo_recording_url"])
check(list(mcp["mcpServers"]) == ["chessbuddy"], "Single existing server")
server = mcp["mcpServers"]["chessbuddy"]
check(server["type"] == "streamable-http" and server["url"] == "https://chessbuddy-self.vercel.app/mcp", "Verified server identity")
check(not server.get("headers"), "No packaged credentials for the public server")
for icon in ("logo", "composerIcon"):
    path = pathlib.PurePosixPath(ui[icon])
    check(not path.is_absolute() and ".." not in path.parts, "Contained icon")
    data = (PACKAGE / path).read_bytes()
    check(data[:8] == b"\x89PNG\r\n\x1a\n" and 0 < len(data) <= 5 * 1024 * 1024, "PNG type/size")
    width, height = struct.unpack(">II", data[16:24])
    check(width == height and 256 <= width <= 4096, "Square logo dimensions")
report["checks"]["icon"] = {"width":width, "height":height, "bytes":len(data)}

# Validate against published portable schemas when reachable. Availability is reported
# separately; custom OpenAI listing checks above still run if the schema host is down.
for name in ("plugin.json", "mcp.json"):
    document = json.loads((PACKAGE / name).read_text())
    try:
        request = urllib.request.Request(document["$schema"], headers={"User-Agent":"ChessBuddy-submission-validation"})
        with urllib.request.urlopen(request, timeout=30) as response:
            schema = json.load(response)
    except Exception as exc:
        report["checks"]["portableSchema:" + name] = {"status":"unavailable", "reason":type(exc).__name__}
    else:
        validator = jsonschema.validators.validator_for(schema)
        validator.check_schema(schema)
        errors = list(validator(schema).iter_errors(document))
        if errors:
            for error in errors:
                print("Schema error:", error.message)
                for detail in error.context:
                    print("  Detail:", list(detail.path), detail.message)
            if name == "mcp.json":
                print("Remote server schema:", json.dumps(schema.get("$defs",{}).get("streamableHttpServer",{})))
            raise errors[0]
        report["checks"]["portableSchema:" + name] = {"status":"passed"}

# Anonymous access checks, without the creator's cookies or provider credentials.
for key, word in {"websiteURL":"ChessBuddy", "supportURL":"h.bahadorzadeh@gmail.com",
                  "privacyPolicyURL":"multiplayer", "termsOfServiceURL":"seven days after creation"}.items():
    value = ui[key]
    https(value)
    check(len(value) <= 1024, "URL length")
    request = urllib.request.Request(value, headers={"User-Agent":"Mozilla/5.0 ChessBuddyReview"})
    with urllib.request.urlopen(request, timeout=45) as response:
        body = response.read(3_000_000).decode("utf-8", errors="replace")
        check(response.status == 200 and word.lower() in body.lower(), "Public content: " + key)
        report["checks"][key] = {"status":response.status, "finalURL":response.url, "contentMatched":True}
demo = review["demo_recording_url"]
request = urllib.request.Request(demo, headers={"User-Agent":"Mozilla/5.0"})
with urllib.request.urlopen(request, timeout=45) as response:
    text = response.read(3_000_000).decode("utf-8", errors="replace")
    check(response.status == 200 and urllib.parse.urlsplit(response.url).hostname != "accounts.google.com",
          "Demo access redirected to sign-in")
    check("ChecssBuddy-demo.mov" in text or "video/quicktime" in text, "Actual video page")
    report["checks"]["demoPage"] = {"status":response.status, "fileMatched":True, "publisherApproved":True,
                                   "independentPlaybackVerified":False}

archive = OUT / "chessbuddy-0.6.0-submission.zip"
expected = ["assets/chessbuddy-icon.png", "mcp.json", "plugin.json"]
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for path in sorted(PACKAGE.rglob("*")):
        if path.is_file():
            check(not path.is_symlink(), "No symlinks")
            z.write(path, path.relative_to(PACKAGE).as_posix())
# Inspect the exact archive handed off, not merely the source tree.
with zipfile.ZipFile(archive) as z:
    check(sorted(z.namelist()) == expected, "Archive inventory")
    check(z.testzip() is None, "Archive CRC")
    check(json.loads(z.read("plugin.json")) == manifest, "Archived manifest changed")
    check(json.loads(z.read("mcp.json")) == mcp, "Archived MCP changed")
    check(z.read(ui["logo"]) == (ROOT / "assets" / "chessbuddy-icon.png").read_bytes(), "Icon bytes changed")
    check(not any(".app.json" in p or p.startswith(("/", "../")) for p in z.namelist()), "Private/unsafe path")
    inventory = "\n".join(f"{item.filename}  {item.file_size} bytes" for item in z.infolist()) + "\n"
(OUT / "archive-contents.txt").write_text(inventory)
report["checks"]["archive"] = {"status":"passed", "sha256":hashlib.sha256(archive.read_bytes()).hexdigest(),
                              "bytes":archive.stat().st_size, "files":expected}
(OUT / "validation-report.json").write_text(json.dumps(report, indent=2) + "\n")
print(inventory)
print(json.dumps(report, indent=2))
