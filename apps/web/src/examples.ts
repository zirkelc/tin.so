import type { SpecInput } from "@tin.so/core";

/**
 * A short example for each language, keyed by the language id.
 * The editor shows it when a person picks a language, so it is short and easy to replace.
 */
export const SIMPLE_EXAMPLES: Record<string, { title: string; code: string }> = {
  abap: {
    title: "zhello.abap",
    code: `REPORT zhello.

DATA greeting TYPE string VALUE 'Hello, ABAP'.
" Print the greeting
WRITE greeting.`,
  },
  "actionscript-3": {
    title: "Main.as",
    code: `package {
  import flash.display.Sprite;

  public class Main extends Sprite {
    public function Main() {
      trace("Hello, ActionScript");
    }
  }
}`,
  },
  ada: {
    title: "hello.adb",
    code: `with Ada.Text_IO; use Ada.Text_IO;

procedure Hello is
   Count : constant Integer := 3;
begin
   -- Print the greeting
   Put_Line ("Hello, Ada" & Integer'Image (Count));
end Hello;`,
  },
  ahk: {
    title: "script.ahk",
    code: `; Press Ctrl+Alt+H to greet
^!h::
MsgBox, Hello, AutoHotkey
return`,
  },
  ahk2: {
    title: "script.ahk",
    code: `; Press Ctrl+Alt+H to greet
^!h:: {
    count := 3
    MsgBox("Hello, AutoHotkey v2 " count)
}`,
  },
  "angular-html": {
    title: "app.component.html",
    code: `<h1>{{ title }}</h1>
<ul>
  @for (item of items; track item.id) {
    <li (click)="select(item)">{{ item.name }}</li>
  }
</ul>`,
  },
  "angular-ts": {
    title: "counter.component.ts",
    code: `import { Component, signal } from "@angular/core";

@Component({
  selector: "app-counter",
  template: \`<button (click)="count.set(count() + 1)">{{ count() }}</button>\`,
})
export class CounterComponent {
  count = signal(0);
}`,
  },
  apache: {
    title: ".htaccess",
    code: `# Redirect all traffic to HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [L,R=301]`,
  },
  apex: {
    title: "Greeter.cls",
    code: `public with sharing class Greeter {
    // Returns a greeting for the given name
    public static String greet(String name) {
        return 'Hello, ' + name;
    }
}`,
  },
  apl: {
    title: "average.apl",
    code: `⍝ The average of a list
avg ← {(+/⍵) ÷ ≢⍵}
avg 1 2 3 4`,
  },
  applescript: {
    title: "hello.applescript",
    code: `-- Show a greeting
set userName to "World"
display dialog "Hello, " & userName buttons {"OK"}`,
  },
  ara: {
    title: "main.ara",
    code: `namespace App;

function greet(string $name): string {
    return 'Hello, ' . $name;
}`,
  },
  asciidoc: {
    title: "README.adoc",
    code: `= Project Title

A short *description* of the project.

== Install

[source,sh]
----
npm install my-package
----`,
  },
  asm: {
    title: "exit.asm",
    code: `section .text
global _start

_start:
    mov rax, 60      ; exit
    mov rdi, 0       ; status code
    syscall`,
  },
  astro: {
    title: "index.astro",
    code: `---
const title = "Hello, Astro";
const items = ["one", "two"];
---
<h1>{title}</h1>
<ul>
  {items.map((item) => <li>{item}</li>)}
</ul>`,
  },
  awk: {
    title: "sum.awk",
    code: `# Sum the second column
{ total += $2 }
END { printf "Total: %d\\n", total }`,
  },
  ballerina: {
    title: "main.bal",
    code: `import ballerina/io;

public function main() {
    string name = "Ballerina";
    io:println("Hello, ", name);
}`,
  },
  bat: {
    title: "build.bat",
    code: `@echo off
rem Build the project
set NAME=app
echo Building %NAME%...
if not exist dist mkdir dist`,
  },
  beancount: {
    title: "ledger.beancount",
    code: `2026-01-01 open Assets:Bank USD
2026-01-01 open Expenses:Coffee USD

2026-01-15 * "Cafe" "Morning coffee"
  Expenses:Coffee   4.50 USD
  Assets:Bank      -4.50 USD`,
  },
  berry: {
    title: "main.be",
    code: `# Greet a name
def greet(name)
  return "Hello, " + name
end

print(greet("Berry"))`,
  },
  bibtex: {
    title: "refs.bib",
    code: `@article{knuth1984,
  author  = {Donald E. Knuth},
  title   = {Literate Programming},
  journal = {The Computer Journal},
  year    = {1984},
}`,
  },
  bicep: {
    title: "main.bicep",
    code: `param location string = resourceGroup().location

// A storage account for the app
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'appstorage'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}`,
  },
  bird2: {
    title: "bird.conf",
    code: `router id 192.0.2.1;

# Announce the local network
protocol static {
  ipv4;
  route 10.0.0.0/24 via 192.0.2.254;
}`,
  },
  blade: {
    title: "welcome.blade.php",
    code: `<h1>Hello, {{ $user->name }}</h1>

@if ($posts->isEmpty())
    <p>No posts yet.</p>
@else
    <p>{{ $posts->count() }} posts</p>
@endif`,
  },
  bsl: {
    title: "Module.bsl",
    code: `// Shows a greeting
Procedure Greet(Name) Export
    Message("Hello, " + Name);
EndProcedure`,
  },
  c: {
    title: "main.c",
    code: `#include <stdio.h>

int main(void) {
    int count = 3;
    // Print the greeting
    printf("Hello, C %d\\n", count);
    return 0;
}`,
  },
  c3: {
    title: "main.c3",
    code: `module hello;
import std::io;

fn void main()
{
    int count = 3;
    io::printfn("Hello, C3 %d", count);
}`,
  },
  cadence: {
    title: "Hello.cdc",
    code: `access(all) contract Hello {
    access(all) let greeting: String

    init() {
        self.greeting = "Hello, Cadence"
    }
}`,
  },
  cairo: {
    title: "main.cairo",
    code: `// Returns the sum of two numbers
fn add(a: u32, b: u32) -> u32 {
    a + b
}

fn main() {
    let total = add(2, 3);
    println!("{}", total);
}`,
  },
  chapel: {
    title: "hello.chpl",
    code: `config const count = 3;

// Print the greeting
for i in 1..count do
  writeln("Hello, Chapel ", i);`,
  },
  clarity: {
    title: "counter.clar",
    code: `;; A simple counter
(define-data-var counter uint u0)

(define-public (increment)
  (begin
    (var-set counter (+ (var-get counter) u1))
    (ok (var-get counter))))`,
  },
  clojure: {
    title: "core.clj",
    code: `(ns app.core)

;; Greet a name
(defn greet [name]
  (str "Hello, " name))

(println (greet "Clojure"))`,
  },
  cmake: {
    title: "app.cmake",
    code: `# Adds an executable with the default warnings
function(add_app name)
  add_executable(\${name} src/main.cpp)
  target_compile_options(\${name} PRIVATE -Wall)
endfunction()

add_app(hello)`,
  },
  cobol: {
    title: "hello.cob",
    code: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. HELLO.
       PROCEDURE DIVISION.
      * Print the greeting
           DISPLAY "Hello, COBOL".
           STOP RUN.`,
  },
  codeowners: {
    title: "CODEOWNERS",
    code: `# Default owners for everything
*            @acme/core

# The docs team owns the docs
/docs/       @acme/docs
*.md         @acme/docs`,
  },
  codeql: {
    title: "eval.ql",
    code: `import javascript

// Find calls to eval
from CallExpr call
where call.getCalleeName() = "eval"
select call, "Avoid eval."`,
  },
  coffee: {
    title: "app.coffee",
    code: `# Greet a name
greet = (name) -> "Hello, #{name}"

for name in ["Ada", "Linus"]
  console.log greet name`,
  },
  "common-lisp": {
    title: "hello.lisp",
    code: `;; Greet a name
(defun greet (name)
  (format nil "Hello, ~a" name))

(print (greet "Lisp"))`,
  },
  coq: {
    title: "Basics.v",
    code: `(* The double of a natural number *)
Fixpoint double (n : nat) : nat :=
  match n with
  | O => O
  | S n' => S (S (double n'))
  end.

Compute double 3.`,
  },
  cpp: {
    title: "main.cpp",
    code: `#include <iostream>
#include <string>

int main() {
    std::string name = "C++";
    // Print the greeting
    std::cout << "Hello, " << name << " " << 23 << '\\n';
}`,
  },
  crystal: {
    title: "hello.cr",
    code: `# Greet a name
def greet(name : String) : String
  "Hello, #{name}"
end

puts greet("Crystal")`,
  },
  csharp: {
    title: "Program.cs",
    code: `var names = new[] { "Ada", "Linus" };

// Print a greeting for each name
foreach (var name in names)
{
    Console.WriteLine($"Hello, {name}");
}`,
  },
  css: {
    title: "styles.css",
    code: `/* A rounded card */
.card {
  padding: 16px;
  border-radius: 8px;
  color: #0f172a;
  background: white;
}`,
  },
  csv: {
    title: "users.csv",
    code: `id,name,email,plan
1,Ada,ada@example.com,pro
2,Linus,linus@example.com,free
3,Grace,grace@example.com,pro`,
  },
  cue: {
    title: "service.cue",
    code: `// The config of a service
service: {
  name:     "api"
  replicas: 3
  port:     int & >0 & <65536
}`,
  },
  cypher: {
    title: "friends.cypher",
    code: `// Find the friends of Ada
MATCH (a:Person {name: "Ada"})-[:KNOWS]->(friend)
RETURN friend.name
LIMIT 10`,
  },
  d: {
    title: "app.d",
    code: `import std.stdio;

void main()
{
    auto count = 3;
    // Print the greeting
    writeln("Hello, D ", count);
}`,
  },
  dart: {
    title: "main.dart",
    code: `void main() {
  final names = ['Ada', 'Linus'];
  // Print a greeting for each name
  for (final name in names) {
    print('Hello, $name');
  }
}`,
  },
  dax: {
    title: "measures.dax",
    code: `-- The total sales of the current year
Sales YTD =
CALCULATE (
    SUM ( Sales[Amount] ),
    DATESYTD ( 'Date'[Date] )
)`,
  },
  desktop: {
    title: "notes.desktop",
    code: `[Desktop Entry]
Type=Application
Name=Notes
Exec=notes %U
Icon=notes
Categories=Utility;`,
  },
  diff: {
    title: "greet.diff",
    code: `--- a/greet.js
+++ b/greet.js
@@ -1,3 +1,3 @@
 function greet(name) {
-  return "Hello " + name;
+  return \`Hello, \${name}\`;
 }`,
  },
  docker: {
    title: "Dockerfile",
    code: `FROM node:22-alpine
WORKDIR /app

# Install the dependencies first for a better cache
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
EXPOSE 3000
CMD ["node", "server.js"]`,
  },
  dotenv: {
    title: ".env",
    code: `# Database
DATABASE_URL="postgres://localhost:5432/app"
PORT=3000
DEBUG=false`,
  },
  "dream-maker": {
    title: "player.dm",
    code: `// A player that greets the world
mob/player
    var/score = 0

    Login()
        world << "Hello, [src.name]"
        ..()`,
  },
  edge: {
    title: "home.edge",
    code: `<h1>Hello, {{ user.name }}</h1>

@if(posts.length)
  <p>{{ posts.length }} posts</p>
@else
  <p>No posts yet.</p>
@end`,
  },
  elixir: {
    title: "greeter.ex",
    code: `defmodule Greeter do
  @moduledoc "Greets people."

  def greet(name), do: "Hello, #{name}"
end

IO.puts(Greeter.greet("Elixir"))`,
  },
  elm: {
    title: "Main.elm",
    code: `module Main exposing (main)

import Html exposing (text)

-- Show a greeting
main =
    text ("Hello, " ++ "Elm")`,
  },
  "emacs-lisp": {
    title: "init.el",
    code: `;; Greet a name
(defun my-greet (name)
  "Show a greeting for NAME."
  (message "Hello, %s" name))

(setq inhibit-startup-screen t)`,
  },
  erb: {
    title: "index.html.erb",
    code: `<h1>Hello, <%= @user.name %></h1>

<% @posts.each do |post| %>
  <p><%= post.title %></p>
<% end %>`,
  },
  erlang: {
    title: "hello.erl",
    code: `-module(hello).
-export([greet/1]).

%% Greet a name
greet(Name) ->
    io:format("Hello, ~s~n", [Name]).`,
  },
  fennel: {
    title: "main.fnl",
    code: `;; Greet a name
(fn greet [name]
  (.. "Hello, " name))

(print (greet "Fennel"))`,
  },
  fish: {
    title: "config.fish",
    code: `# Greet the user on start
function greet
    set -l name (whoami)
    echo "Hello, $name"
end

set -gx EDITOR nvim`,
  },
  fluent: {
    title: "main.ftl",
    code: `# The greeting on the home page
hello = Hello, { $name }!
emails =
    { $count ->
        [one] You have one new email.
       *[other] You have { $count } new emails.
    }`,
  },
  "fortran-fixed-form": {
    title: "hello.f",
    code: `C     Print the greeting
      PROGRAM HELLO
      INTEGER N
      N = 3
      PRINT *, 'Hello, Fortran', N
      END`,
  },
  "fortran-free-form": {
    title: "hello.f90",
    code: `program hello
  implicit none
  integer :: count = 3
  ! Print the greeting
  print *, "Hello, Fortran", count
end program hello`,
  },
  fsharp: {
    title: "Program.fs",
    code: `// Greet a name
let greet name = sprintf "Hello, %s" name

[ "Ada"; "Linus" ]
|> List.iter (greet >> printfn "%s")`,
  },
  gdresource: {
    title: "player.tres",
    code: `[gd_resource type="Resource" script_class="PlayerStats" format=3]

[ext_resource type="Script" path="res://player_stats.gd" id="1"]

[resource]
script = ExtResource("1")
speed = 300.0
health = 100`,
  },
  gdscript: {
    title: "player.gd",
    code: `extends CharacterBody2D

@export var speed := 300.0

# Move with the arrow keys
func _physics_process(delta):
    velocity = Input.get_vector("left", "right", "up", "down") * speed
    move_and_slide()`,
  },
  gdshader: {
    title: "tint.gdshader",
    code: `shader_type canvas_item;

uniform vec4 tint : source_color = vec4(0.2, 0.5, 1.0, 1.0);

// Tint the texture
void fragment() {
    COLOR = texture(TEXTURE, UV) * tint;
}`,
  },
  genie: {
    title: "hello.gs",
    code: `// Print the greeting
init
    var name = "Genie"
    print "Hello, %s", name`,
  },
  gherkin: {
    title: "login.feature",
    code: `Feature: Login

  Scenario: A user signs in
    Given a user with the email "ada@example.com"
    When she signs in with the right password
    Then she sees her dashboard`,
  },
  "git-commit": {
    title: "COMMIT_EDITMSG",
    code: `feat: add dark mode

Add a toggle in the settings that switches the theme.

# Please enter the commit message for your changes.
# On branch main`,
  },
  "git-rebase": {
    title: "git-rebase-todo",
    code: `pick 3f2a1b7 feat: add dark mode
squash 9c4d2e1 fix: typo in toggle label
reword a7b8c9d docs: describe the theme setting

# Rebase 1a2b3c4..a7b8c9d onto 1a2b3c4 (3 commands)`,
  },
  gleam: {
    title: "app.gleam",
    code: `import gleam/io

// Greet a name
pub fn greet(name: String) -> String {
  "Hello, " <> name
}

pub fn main() {
  io.println(greet("Gleam"))
}`,
  },
  "glimmer-js": {
    title: "counter.gjs",
    code: `import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

export default class Counter extends Component {
  @tracked count = 0;

  <template>
    <button>{{this.count}}</button>
  </template>
}`,
  },
  "glimmer-ts": {
    title: "greeting.gts",
    code: `import type { TOC } from "@ember/component/template-only";

interface Signature {
  Args: { name: string };
}

const Greeting: TOC<Signature> = <template>
  <p>Hello, {{@name}}</p>
</template>;`,
  },
  glsl: {
    title: "color.glsl",
    code: `#version 330 core

uniform vec3 color;
out vec4 fragColor;

// Fill the pixel with a color
void main() {
    fragColor = vec4(color, 1.0);
}`,
  },
  gn: {
    title: "BUILD.gn",
    code: `# The main program
executable("hello") {
  sources = [ "main.cc" ]
  deps = [ ":greeter" ]
}`,
  },
  gnuplot: {
    title: "sine.gnuplot",
    code: `# Plot a sine wave
set title "Sine"
set xrange [0:2*pi]
plot sin(x) with lines linewidth 2`,
  },
  go: {
    title: "main.go",
    code: `package main

import "fmt"

func main() {
    count := 3
    // Print the greeting
    fmt.Printf("Hello, Go %d\\n", count)
}`,
  },
  graphql: {
    title: "schema.graphql",
    code: `# A user of the app
type User {
  id: ID!
  name: String!
  posts(first: Int = 10): [Post!]!
}`,
  },
  groovy: {
    title: "App.groovy",
    code: `// Greet each name
def names = ["Ada", "Linus"]

names.each { name ->
    println "Hello, \${name}"
}`,
  },
  hack: {
    title: "main.hack",
    code: `// Greet a name
function greet(string $name): string {
  return "Hello, ".$name;
}

<<__EntryPoint>>
function main(): void {
  echo greet("Hack");
}`,
  },
  haml: {
    title: "index.haml",
    code: `%h1 Hello, #{@user.name}
- if @posts.any?
  %ul
    - @posts.each do |post|
      %li= post.title
- else
  %p No posts yet.`,
  },
  handlebars: {
    title: "card.hbs",
    code: `<div class="card">
  <h2>{{title}}</h2>
  {{#if author}}
    <p>By {{author.name}}</p>
  {{/if}}
</div>`,
  },
  haskell: {
    title: "Main.hs",
    code: `module Main where

-- Greet a name
greet :: String -> String
greet name = "Hello, " ++ name

main :: IO ()
main = putStrLn (greet "Haskell")`,
  },
  haxe: {
    title: "Main.hx",
    code: `class Main {
  // Print the greeting
  static function main() {
    var count = 3;
    trace('Hello, Haxe $count');
  }
}`,
  },
  hcl: {
    title: "service.hcl",
    code: `# The service settings
service "api" {
  port     = 8080
  replicas = 3
  tags     = ["web", "public"]
}`,
  },
  hjson: {
    title: "service.hjson",
    code: `{
  # The service settings
  name: api
  port: 8080
  tags: [
    web
    public
  ]
}`,
  },
  hlsl: {
    title: "tint.hlsl",
    code: `float4 tint;

// Tint the color of the pixel
float4 main(float4 color : COLOR) : SV_TARGET
{
    return color * tint;
}`,
  },
  html: {
    title: "index.html",
    code: `<!doctype html>
<html lang="en">
  <head>
    <title>Hello</title>
  </head>
  <body>
    <!-- The main heading -->
    <h1 class="title">Hello, HTML</h1>
  </body>
</html>`,
  },
  "html-derivative": {
    title: "hero.html",
    code: `<section class="hero">
  <!-- A fragment of a page -->
  <h1>Hello</h1>
  <a href="/start" class="button">Get started</a>
</section>`,
  },
  http: {
    title: "users.http",
    code: `### Create a user
POST https://api.example.com/users
Content-Type: application/json

{
  "name": "Ada",
  "plan": "pro"
}`,
  },
  hurl: {
    title: "health.hurl",
    code: `# Check that the API is up
GET https://api.example.com/health
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"`,
  },
  hxml: {
    title: "build.hxml",
    code: `# Build for JavaScript
-cp src
-main Main
-js bin/main.js
-D analyzer-optimize`,
  },
  hy: {
    title: "hello.hy",
    code: `;; Greet a name
(defn greet [name]
  (+ "Hello, " name))

(print (greet "Hy"))`,
  },
  imba: {
    title: "counter.imba",
    code: `# A button that counts the clicks
tag app-counter
    count = 0
    <self>
        <button @click=(count++)> "Clicked {count} times"

imba.mount <app-counter>`,
  },
  ini: {
    title: "config.ini",
    code: `; The app settings
[server]
host = localhost
port = 8080

[log]
level = info`,
  },
  java: {
    title: "Main.java",
    code: `public class Main {
    public static void main(String[] args) {
        int count = 3;
        // Print the greeting
        System.out.println("Hello, Java " + count);
    }
}`,
  },
  javascript: {
    title: "main.js",
    code: `// Greet a name
function greet(name) {
  return \`Hello, \${name}\`;
}

const names = ["Ada", "Linus"];
names.forEach((name) => console.log(greet(name)));`,
  },
  jinja: {
    title: "posts.jinja",
    code: `{# The list of posts #}
<h1>{{ title }}</h1>
<ul>
{% for post in posts %}
  <li>{{ post.title | upper }}</li>
{% endfor %}
</ul>`,
  },
  jison: {
    title: "calc.jison",
    code: `/* A tiny calculator */
%lex
%%
\\s+       /* skip whitespace */
[0-9]+    return 'NUMBER'
"+"       return '+'
<<EOF>>   return 'EOF'
/lex`,
  },
  json: {
    title: "user.json",
    code: `{
  "name": "Ada",
  "age": 36,
  "admin": true,
  "tags": ["math", "code"]
}`,
  },
  json5: {
    title: "service.json5",
    code: `{
  // The service settings
  name: "api",
  port: 8080,
  tags: ["web", "public"],
}`,
  },
  jsonc: {
    title: "settings.jsonc",
    code: `{
  // The editor settings
  "editor.fontSize": 14,
  "editor.formatOnSave": true,
  "files.exclude": { "dist": true },
}`,
  },
  jsonl: {
    title: "events.jsonl",
    code: `{"type": "signup", "user": "ada", "at": 1700000000}
{"type": "login", "user": "ada", "at": 1700000420}
{"type": "logout", "user": "ada", "at": 1700003600}`,
  },
  jsonnet: {
    title: "service.jsonnet",
    code: `// The service settings
local port = 8080;

{
  name: 'api',
  port: port,
  url: 'http://localhost:%d' % port,
}`,
  },
  jssm: {
    title: "traffic-light.fsl",
    code: `machine_name: "Traffic light";

// The light goes round
Green => Yellow => Red => Green;
[Green Yellow Red] ~> Off;`,
  },
  jsx: {
    title: "Counter.jsx",
    code: `import { useState } from "react";

// A button that counts the clicks
export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
}`,
  },
  julia: {
    title: "main.jl",
    code: `# Greet a name
greet(name) = "Hello, $name"

for name in ["Ada", "Linus"]
    println(greet(name))
end`,
  },
  just: {
    title: "justfile",
    code: `# Run the tests
test:
    cargo test

# Build a release
build mode="release":
    cargo build --{{mode}}`,
  },
  kdl: {
    title: "service.kdl",
    code: `// The service settings
service "api" {
    port 8080
    replicas 3
    tags "web" "public"
}`,
  },
  kotlin: {
    title: "Main.kt",
    code: `// Greet a name
fun greet(name: String) = "Hello, $name"

fun main() {
    val names = listOf("Ada", "Linus")
    names.forEach { println(greet(it)) }
}`,
  },
  kusto: {
    title: "requests.kql",
    code: `// Requests per hour in the last day
requests
| where timestamp > ago(1d)
| summarize count() by bin(timestamp, 1h)
| order by timestamp asc`,
  },
  latex: {
    title: "main.tex",
    code: `\\documentclass{article}

\\begin{document}
% The title of the page
\\section{Hello}
The formula $e^{i\\pi} + 1 = 0$ is famous.
\\end{document}`,
  },
  lean: {
    title: "Main.lean",
    code: `-- Greet a name
def greet (name : String) : String :=
  s!"Hello, {name}"

#eval greet "Lean"`,
  },
  less: {
    title: "styles.less",
    code: `// The brand color
@brand: #6366f1;

.button {
  color: white;
  background: @brand;
  &:hover { background: darken(@brand, 10%); }
}`,
  },
  liquid: {
    title: "product.liquid",
    code: `{% comment %} The product card {% endcomment %}
<h2>{{ product.title }}</h2>
{% if product.available %}
  <p>{{ product.price | money }}</p>
{% else %}
  <p>Sold out</p>
{% endif %}`,
  },
  llvm: {
    title: "add.ll",
    code: `; Returns the sum of two numbers
define i32 @add(i32 %a, i32 %b) {
entry:
  %sum = add i32 %a, %b
  ret i32 %sum
}`,
  },
  log: {
    title: "app.log",
    code: `2026-10-29 09:14:02 INFO  Server started on port 8080
2026-10-29 09:14:05 DEBUG Connected to database
2026-10-29 09:15:41 WARN  Slow request: GET /users took 1200ms
2026-10-29 09:16:03 ERROR Timeout while calling payments API`,
  },
  logo: {
    title: "square.logo",
    code: `; Draw a square
to square :size
  repeat 4 [forward :size right 90]
end

square 100`,
  },
  lua: {
    title: "init.lua",
    code: `-- Greet a name
local function greet(name)
  return "Hello, " .. name
end

for _, name in ipairs({ "Ada", "Linus" }) do
  print(greet(name))
end`,
  },
  luau: {
    title: "main.luau",
    code: `-- Greet a name
local function greet(name: string): string
  return \`Hello, {name}\`
end

print(greet("Luau"))`,
  },
  make: {
    title: "Makefile",
    code: `CC = gcc
CFLAGS = -Wall -O2

# Build the program
app: main.c ; $(CC) $(CFLAGS) -o app main.c

.PHONY: clean
clean: ; rm -f app`,
  },
  markdown: {
    title: "README.md",
    code: `# My Project

A **short** description of the project.

## Install

- Run \`npm install my-project\`
- Read the [docs](https://example.com)`,
  },
  marko: {
    title: "counter.marko",
    code: `<let/count=0/>

<h1>Hello, \${input.name}</h1>
<button onClick() { count++ }>
  Clicked \${count} times
</button>`,
  },
  matlab: {
    title: "sine.m",
    code: `% Plot a sine wave
x = linspace(0, 2*pi, 100);
y = sin(x);
plot(x, y, 'LineWidth', 2)
title('Sine')`,
  },
  mdc: {
    title: "index.mdc",
    code: `# Hello

::alert{type="info"}
This is an **MDC** component.
::

A [link]{.text-blue} with a class.`,
  },
  mdx: {
    title: "post.mdx",
    code: `import { Chart } from "./chart";

# Monthly growth

The numbers grew by **12%** this month.

<Chart data={[3, 5, 8]} />`,
  },
  mermaid: {
    title: "login.mmd",
    code: `flowchart LR
  A[Start] --> B{Logged in?}
  B -- Yes --> C[Dashboard]
  B -- No --> D[Login]`,
  },
  mipsasm: {
    title: "print.s",
    code: `# Print a number
        .text
main:
        li   $a0, 42        # the number
        li   $v0, 1         # print_int
        syscall
        li   $v0, 10        # exit
        syscall`,
  },
  mojo: {
    title: "main.mojo",
    code: `# Greet a name
fn greet(name: String) -> String:
    return "Hello, " + name

fn main():
    var count = 3
    print(greet("Mojo"), count)`,
  },
  moonbit: {
    title: "main.mbt",
    code: `// Greet a name
fn greet(name : String) -> String {
  "Hello, \\{name}"
}

fn main {
  println(greet("MoonBit"))
}`,
  },
  move: {
    title: "counter.move",
    code: `module 0x1::counter {
    // A counter that anyone can increment
    struct Counter has key {
        value: u64,
    }

    public fun increment(counter: &mut Counter) {
        counter.value = counter.value + 1;
    }
}`,
  },
  narrat: {
    title: "game.narrat",
    code: `main:
  talk helper idle "Hello, traveler."
  set data.coins 10
  if (> $data.coins 5):
    "You have enough coins."`,
  },
  nextflow: {
    title: "main.nf",
    code: `process sayHello {
    input:
    val name

    script:
    "echo Hello, $name"
}

workflow {
    Channel.of("Ada", "Linus") | sayHello
}`,
  },
  "nextflow-groovy": {
    title: "main.nf",
    code: `// The parameters of the pipeline
params.reads = "data/*.fastq"
params.outdir = "results"

def sampleName(file) {
    return file.baseName.tokenize("_")[0]
}`,
  },
  nginx: {
    title: "nginx.conf",
    code: `server {
    listen 80;
    server_name example.com;

    # Send the API calls to the app
    location /api/ {
        proxy_pass http://localhost:3000;
    }
}`,
  },
  nim: {
    title: "main.nim",
    code: `# Greet a name
proc greet(name: string): string =
  "Hello, " & name

for name in ["Ada", "Linus"]:
  echo greet(name)`,
  },
  nix: {
    title: "shell.nix",
    code: `{ pkgs ? import <nixpkgs> { } }:

# A shell with the build tools
pkgs.mkShell {
  packages = [ pkgs.nodejs_22 pkgs.pnpm ];
  shellHook = "echo ready";
}`,
  },
  nsis: {
    title: "installer.nsi",
    code: `; A minimal installer
Name "My App"
OutFile "setup.exe"
InstallDir "$PROGRAMFILES\\MyApp"

Section "Install"
  SetOutPath $INSTDIR
  File "app.exe"
SectionEnd`,
  },
  nushell: {
    title: "config.nu",
    code: `# List the largest files
def big-files [limit: int = 5] {
  ls | sort-by size --reverse | first $limit
}

$env.config.show_banner = false`,
  },
  "objective-c": {
    title: "main.m",
    code: `#import <Foundation/Foundation.h>

int main(void) {
    @autoreleasepool {
        NSString *name = @"Objective-C";
        // Print the greeting
        NSLog(@"Hello, %@", name);
    }
    return 0;
}`,
  },
  "objective-cpp": {
    title: "main.mm",
    code: `#import <Foundation/Foundation.h>
#include <vector>

int main() {
    std::vector<int> numbers = {1, 2, 3};
    // Print the size with Foundation
    NSLog(@"Count: %zu", numbers.size());
    return 0;
}`,
  },
  ocaml: {
    title: "main.ml",
    code: `(* Greet a name *)
let greet name = "Hello, " ^ name

let () =
  List.iter (fun name -> print_endline (greet name)) ["Ada"; "Linus"]`,
  },
  odin: {
    title: "main.odin",
    code: `package main

import "core:fmt"

// Print the greeting
main :: proc() {
    count := 3
    fmt.println("Hello, Odin", count)
}`,
  },
  openscad: {
    title: "box.scad",
    code: `// A box with a hole
size = 20;

difference() {
  cube(size, center = true);
  cylinder(h = size + 2, r = 5, center = true);
}`,
  },
  org: {
    title: "notes.org",
    code: `* Project
** TODO Write the docs
   DEADLINE: <2026-11-01>
** DONE Set up the repo
   - Add a *license*
   - Add the CI`,
  },
  pascal: {
    title: "hello.pas",
    code: `program Hello;

var
  Count: Integer;
begin
  Count := 3;
  { Print the greeting }
  WriteLn('Hello, Pascal ', Count);
end.`,
  },
  perl: {
    title: "hello.pl",
    code: `use strict;
use warnings;

# Greet each name
my @names = ("Ada", "Linus");
for my $name (@names) {
    print "Hello, $name\\n";
}`,
  },
  php: {
    title: "index.php",
    code: `<?php

// Greet a name
function greet(string $name): string
{
    return "Hello, {$name}";
}

echo greet("PHP");`,
  },
  pkl: {
    title: "service.pkl",
    code: `// The service settings
name = "api"
port: Int = 8080

replicas {
  min = 2
  max = 5
}`,
  },
  plsql: {
    title: "raise_salary.pls",
    code: `CREATE OR REPLACE PROCEDURE raise_salary (p_id NUMBER, p_pct NUMBER) IS
BEGIN
  -- Raise the salary of one employee
  UPDATE employees
     SET salary = salary * (1 + p_pct / 100)
   WHERE id = p_id;
END;`,
  },
  po: {
    title: "messages.po",
    code: `# The greeting on the home page
msgid "Hello, %s"
msgstr "Hallo, %s"

msgid "One file"
msgid_plural "%d files"
msgstr[0] "Eine Datei"
msgstr[1] "%d Dateien"`,
  },
  polar: {
    title: "policy.polar",
    code: `# Users can read their own posts
allow(user: User, "read", post: Post) if
  post.author_id = user.id;

# Admins can do everything
allow(user: User, _action, _resource) if
  user.role = "admin";`,
  },
  postcss: {
    title: "card.postcss",
    code: `@custom-media --small (width < 600px);

/* A card with nested rules */
.card {
  padding: 16px;

  @media (--small) {
    padding: 8px;
  }
}`,
  },
  powerquery: {
    title: "sales.pq",
    code: `let
    // Load the sales table
    Source = Csv.Document(File.Contents("sales.csv")),
    Typed = Table.TransformColumnTypes(Source, {{"Amount", type number}}),
    Large = Table.SelectRows(Typed, each [Amount] > 100)
in
    Large`,
  },
  powershell: {
    title: "build.ps1",
    code: `# Build each project
$projects = @("api", "web")

foreach ($name in $projects) {
    Write-Host "Building $name..."
    dotnet build "./src/$name"
}`,
  },
  prisma: {
    title: "schema.prisma",
    code: `// A user of the app
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}`,
  },
  prolog: {
    title: "family.pl",
    code: `% Facts
parent(tom, bob).
parent(bob, ann).

% A grandparent is a parent of a parent
grandparent(X, Z) :- parent(X, Y), parent(Y, Z).`,
  },
  proto: {
    title: "user.proto",
    code: `syntax = "proto3";

// A user of the app
message User {
  string id = 1;
  string email = 2;
  repeated string tags = 3;
}`,
  },
  pug: {
    title: "posts.pug",
    code: `//- The list of posts
h1= title
ul
  each post in posts
    li.post= post.title`,
  },
  puppet: {
    title: "site.pp",
    code: `# Install and run nginx
package { 'nginx':
  ensure => installed,
}

service { 'nginx':
  ensure  => running,
  require => Package['nginx'],
}`,
  },
  purescript: {
    title: "Main.purs",
    code: `module Main where

import Prelude
import Effect.Console (log)

-- Greet a name
main = log ("Hello, " <> "PureScript")`,
  },
  python: {
    title: "main.py",
    code: `# Greet a name
def greet(name: str) -> str:
    return f"Hello, {name}"


for name in ["Ada", "Linus"]:
    print(greet(name))`,
  },
  qml: {
    title: "Main.qml",
    code: `import QtQuick

// A button that counts the clicks
Rectangle {
    property int count: 0
    width: 200; height: 80
    color: "#6366f1"

    MouseArea { anchors.fill: parent; onClicked: count++ }
}`,
  },
  qmldir: {
    title: "qmldir",
    code: `module App.Controls
plugin appcontrols
Button 1.0 Button.qml
Slider 1.0 Slider.qml`,
  },
  qss: {
    title: "style.qss",
    code: `/* The main button */
QPushButton {
    color: white;
    background-color: #6366f1;
    border-radius: 6px;
}

QPushButton:hover { background-color: #4f46e5; }`,
  },
  r: {
    title: "analysis.R",
    code: `# The mean of a column
data <- data.frame(name = c("a", "b", "c"), value = c(3, 5, 8))
avg <- mean(data$value)
print(paste("Average:", avg))`,
  },
  racket: {
    title: "main.rkt",
    code: `#lang racket

; Greet a name
(define (greet name)
  (string-append "Hello, " name))

(displayln (greet "Racket"))`,
  },
  raku: {
    title: "hello.raku",
    code: `# Greet each name
my @names = <Ada Linus>;

for @names -> $name {
    say "Hello, $name";
}`,
  },
  razor: {
    title: "Counter.razor",
    code: `<h1>Counter</h1>
<button @onclick="Increment">Clicked @count times</button>

@code {
    private int count = 0;

    private void Increment() => count++;
}`,
  },
  rbs: {
    title: "user.rbs",
    code: `# A user of the app
class User
  attr_reader name: String
  attr_reader age: Integer

  def initialize: (name: String, age: Integer) -> void
  def adult?: () -> bool
end`,
  },
  reg: {
    title: "settings.reg",
    code: `Windows Registry Editor Version 5.00

; The app settings
[HKEY_CURRENT_USER\\Software\\MyApp]
"Theme"="dark"
"FontSize"=dword:0000000e`,
  },
  regexp: {
    title: "email.regex",
    code: `^[\\w.+-]+@[\\w-]+\\.[a-z]{2,}$`,
  },
  rel: {
    title: "people.rel",
    code: `// People older than 30
def person = {("Ada", 36); ("Linus", 29)}

def older(name) = exists(age: person(name, age) and age > 30)`,
  },
  riscv: {
    title: "exit.s",
    code: `# Exit with status 0
    .globl _start
_start:
    li a0, 0        # status code
    li a7, 93       # exit
    ecall`,
  },
  ron: {
    title: "config.ron",
    code: `// The game settings
(
    title: "My Game",
    window: (width: 1280, height: 720),
    fullscreen: false,
)`,
  },
  rosmsg: {
    title: "Pose.msg",
    code: `# A position and an orientation
Header header
geometry_msgs/Point position
float64 yaw
string frame_id`,
  },
  rst: {
    title: "index.rst",
    code: `Project Title
=============

A **short** description of the project.

.. code-block:: sh

   pip install my-project`,
  },
  ruby: {
    title: "app.rb",
    code: `# Greet a name
def greet(name)
  "Hello, #{name}"
end

%w[Ada Linus].each { |name| puts greet(name) }`,
  },
  rust: {
    title: "main.rs",
    code: `// Greet a name
fn greet(name: &str) -> String {
    format!("Hello, {name}")
}

fn main() {
    let count = 3;
    println!("{} ({count})", greet("Rust"));
}`,
  },
  sas: {
    title: "report.sas",
    code: `/* The average price by type */
proc means data=sashelp.cars mean;
  class type;
  var msrp;
run;`,
  },
  sass: {
    title: "styles.sass",
    code: `// The brand color
$brand: #6366f1

.button
  color: white
  background: $brand
  &:hover
    background: darken($brand, 10%)`,
  },
  scala: {
    title: "Main.scala",
    code: `// Greet a name
def greet(name: String): String = s"Hello, $name"

@main def run(): Unit =
  List("Ada", "Linus").foreach(name => println(greet(name)))`,
  },
  scheme: {
    title: "hello.scm",
    code: `; Greet a name
(define (greet name)
  (string-append "Hello, " name))

(display (greet "Scheme"))
(newline)`,
  },
  scss: {
    title: "styles.scss",
    code: `// The brand color
$brand: #6366f1;

.button {
  color: white;
  background: $brand;
  &:hover { background: darken($brand, 10%); }
}`,
  },
  sdbl: {
    title: "products.sdbl",
    code: `// Products with a low stock
SELECT
    Products.Description AS Name,
    Products.Stock AS Stock
FROM
    Catalog.Products AS Products
WHERE
    Products.Stock < 10`,
  },
  shaderlab: {
    title: "Unlit.shader",
    code: `Shader "Custom/Unlit"
{
    Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
    }
    SubShader
    {
        Pass { Color [_Color] }
    }
}`,
  },
  shellscript: {
    title: "deploy.sh",
    code: `#!/usr/bin/env bash
set -euo pipefail

# Deploy the app
name="app"
echo "Deploying $name..."
npm run build && rsync -a dist/ "server:/var/www/$name"`,
  },
  shellsession: {
    title: "Terminal",
    code: `$ npm install
added 42 packages in 2s
$ npm test
All tests passed`,
  },
  smalltalk: {
    title: "Counter.st",
    code: `"A counter"
Object subclass: #Counter
    instanceVariableNames: 'count'
    classVariableNames: ''
    package: 'Demo'.

Counter >> increment
    count := (count ifNil: [0]) + 1.
    ^ count`,
  },
  smithy: {
    title: "weather.smithy",
    code: `$version: "2"
namespace example.weather

// Get the weather of a city
operation GetForecast {
    input := { @required city: String }
    output := { temperature: Float }
}`,
  },
  solidity: {
    title: "Counter.sol",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// A counter that anyone can increment
contract Counter {
    uint256 public count;

    function increment() external {
        count += 1;
    }
}`,
  },
  soy: {
    title: "greeting.soy",
    code: `{namespace app.templates}

/** Greets a person. */
{template .greeting}
  {@param name: string}
  <p>Hello, {$name}!</p>
{/template}`,
  },
  sparql: {
    title: "people.sparql",
    code: `PREFIX foaf: <http://xmlns.com/foaf/0.1/>

# The names of all people
SELECT ?name
WHERE {
  ?person a foaf:Person ;
          foaf:name ?name .
}
LIMIT 10`,
  },
  splunk: {
    title: "errors.spl",
    code: `index=web status>=500
| stats count by uri_path
| sort -count
| head 10`,
  },
  sql: {
    title: "query.sql",
    code: `-- The ten newest users on the pro plan
SELECT id, name, created_at
FROM users
WHERE plan = 'pro'
ORDER BY created_at DESC
LIMIT 10;`,
  },
  "ssh-config": {
    title: "config",
    code: `# The build server
Host build
    HostName 192.0.2.10
    User deploy
    Port 2222
    IdentityFile ~/.ssh/build_ed25519`,
  },
  stata: {
    title: "analysis.do",
    code: `* The price of the cars
sysuse auto, clear
summarize price
regress price mpg weight`,
  },
  stylus: {
    title: "styles.styl",
    code: `// The brand color
brand = #6366f1

.button
  color white
  background brand
  &:hover
    background darken(brand, 10%)`,
  },
  surrealql: {
    title: "schema.surql",
    code: `-- A user table with a unique email
DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD email ON user TYPE string;
DEFINE INDEX email ON user FIELDS email UNIQUE;

CREATE user SET email = "ada@example.com";`,
  },
  svelte: {
    title: "Counter.svelte",
    code: `<script>
  let count = $state(0);
</script>

<!-- A button that counts the clicks -->
<button onclick={() => count++}>
  Clicked {count} times
</button>`,
  },
  swift: {
    title: "main.swift",
    code: `// Greet a name
func greet(_ name: String) -> String {
    "Hello, \\(name)"
}

let names = ["Ada", "Linus"]
names.forEach { print(greet($0)) }`,
  },
  "system-verilog": {
    title: "counter.sv",
    code: `// A counter with a reset
module counter (
  input  logic       clk, rst,
  output logic [7:0] count
);
  always_ff @(posedge clk)
    if (rst) count <= '0;
    else     count <= count + 1;
endmodule`,
  },
  systemd: {
    title: "app.service",
    code: `[Unit]
Description=My App
After=network.target

[Service]
ExecStart=/usr/bin/node /srv/app/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target`,
  },
  talonscript: {
    title: "editor.talon",
    code: `app: vscode
-
# Voice commands for the editor
save file: key(cmd-s)
go to line <number>: user.go_to_line(number)`,
  },
  tasl: {
    title: "people.tasl",
    code: `# A schema for people
namespace ex http://example.com/

class ex:person :: {
  ex:name -> string
  ex:age -> integer
}`,
  },
  tcl: {
    title: "hello.tcl",
    code: `# Greet a name
proc greet {name} {
    return "Hello, $name"
}

puts [greet "Tcl"]`,
  },
  templ: {
    title: "hello.templ",
    code: `package views

// A greeting for a name
templ Hello(name string) {
  <p class="greeting">Hello, { name }</p>
}`,
  },
  terraform: {
    title: "main.tf",
    code: `# A bucket for the assets
resource "aws_s3_bucket" "assets" {
  bucket = "my-app-assets"

  tags = {
    Environment = var.env
  }
}`,
  },
  tex: {
    title: "macros.tex",
    code: `% A macro for a vector
\\def\\vec#1{\\mathbf{#1}}

\\parindent=0pt
Hello, \\TeX! The vector is $\\vec{v}$.
\\bye`,
  },
  toml: {
    title: "Cargo.toml",
    code: `# The package settings
[package]
name = "hello"
version = "0.1.0"
edition = "2024"

[dependencies]
serde = { version = "1", features = ["derive"] }`,
  },
  "ts-tags": {
    title: "hello-element.ts",
    code: `import { html, LitElement } from "lit";

// A greeting element
export class HelloElement extends LitElement {
  name = "World";

  render() {
    return html\`<p>Hello, \${this.name}</p>\`;
  }
}`,
  },
  // Tab-separated values need tabs between the columns
  tsv: {
    title: "users.tsv",
    code: "id\tname\tplan\n1\tAda\tpro\n2\tLinus\tfree\n3\tGrace\tpro",
  },
  tsx: {
    title: "Greeting.tsx",
    code: `type Props = { name: string };

// A greeting for a name
export function Greeting({ name }: Props) {
  return <p className="greeting">Hello, {name}</p>;
}`,
  },
  turtle: {
    title: "people.ttl",
    code: `@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.com/> .

# Ada knows Linus
ex:ada a foaf:Person ;
    foaf:name "Ada" ;
    foaf:knows ex:linus .`,
  },
  twig: {
    title: "posts.html.twig",
    code: `{# The list of posts #}
<h1>{{ title }}</h1>
<ul>
  {% for post in posts %}
    <li>{{ post.title|upper }}</li>
  {% endfor %}
</ul>`,
  },
  typescript: {
    title: "main.ts",
    code: `type User = { name: string; age: number };

// Greet a user
function greet(user: User): string {
  return \`Hello, \${user.name}\`;
}

console.log(greet({ name: "Ada", age: 36 }));`,
  },
  typespec: {
    title: "main.tsp",
    code: `import "@typespec/http";

using Http;

// A user of the app
model User {
  id: string;
  age?: int32;
}

@route("/users") op list(): User[];`,
  },
  typst: {
    title: "paper.typ",
    code: `#set page(width: 12cm, height: auto)

= Hello, Typst

The sum is $sum_(i=1)^n i = (n(n+1))/2$.
#lorem(10)`,
  },
  v: {
    title: "main.v",
    code: `// Greet a name
fn greet(name string) string {
    return 'Hello, \${name}'
}

fn main() {
    println(greet('V'))
}`,
  },
  vala: {
    title: "main.vala",
    code: `// Print the greeting
void main () {
    var count = 3;
    print ("Hello, Vala %d\\n", count);
}`,
  },
  vb: {
    title: "Module1.vb",
    code: `Module Module1
    ' Print the greeting
    Sub Main()
        Dim count As Integer = 3
        Console.WriteLine("Hello, VB " & count)
    End Sub
End Module`,
  },
  verilog: {
    title: "counter.v",
    code: `// A counter with a reset
module counter (input clk, input rst, output reg [7:0] count);
  always @(posedge clk)
    if (rst) count <= 8'd0;
    else     count <= count + 1;
endmodule`,
  },
  vhdl: {
    title: "counter.vhd",
    code: `-- A counter with a reset
library ieee;
use ieee.std_logic_1164.all;

entity counter is
  port (clk, rst : in std_logic);
end entity counter;`,
  },
  viml: {
    title: "greet.vim",
    code: `" Use spaces for tabs
set expandtab shiftwidth=2

" Greet a name
function! Greet(name) abort
  echo 'Hello, ' . a:name
endfunction`,
  },
  vue: {
    title: "Counter.vue",
    code: `<script setup>
import { ref } from "vue";
const count = ref(0);
</script>

<template>
  <button @click="count++">Clicked {{ count }} times</button>
</template>`,
  },
  "vue-html": {
    title: "posts.html",
    code: `<ul>
  <li v-for="post in posts" :key="post.id">
    {{ post.title }}
  </li>
</ul>
<p v-if="!posts.length">No posts yet.</p>`,
  },
  "vue-vine": {
    title: "Counter.vine.ts",
    code: `// A button that counts the clicks
function Counter() {
  const count = ref(0);

  return vine\`
    <button @click="count++">Clicked {{ count }} times</button>
  \`;
}`,
  },
  vyper: {
    title: "counter.vy",
    code: `# A counter that anyone can increment
count: public(uint256)

@external
def increment():
    self.count += 1`,
  },
  wasm: {
    title: "add.wat",
    code: `;; Returns the sum of two numbers
(module
  (func $add (export "add") (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add))`,
  },
  wenyan: {
    title: "hello.wy",
    code: `吾有一數。曰三。名之曰「甲」。
為是「甲」遍。
  吾有一言。曰「「問天地好在。」」。書之。
云云。`,
  },
  wgsl: {
    title: "tint.wgsl",
    code: `@group(0) @binding(0) var<uniform> tint: vec4f;

// Tint every pixel
@fragment
fn main() -> @location(0) vec4f {
    return tint * 0.5;
}`,
  },
  wikitext: {
    title: "page.wiki",
    code: `== History ==
'''Ada Lovelace''' wrote the first ''program''.

* Born in 1815
* See [[Analytical Engine]]
{{Citation needed}}`,
  },
  wit: {
    title: "greeter.wit",
    code: `package example:greeter;

// A component that greets people
world greeter {
    export greet: func(name: string) -> string;
}`,
  },
  wolfram: {
    title: "sine.wl",
    code: `(* Plot a sine wave *)
f[x_] := Sin[x]
Plot[f[x], {x, 0, 2 Pi}, PlotStyle -> Thick]`,
  },
  xml: {
    title: "config.xml",
    code: `<?xml version="1.0" encoding="UTF-8"?>
<!-- The app settings -->
<config>
  <server host="localhost" port="8080" />
  <log level="info" />
</config>`,
  },
  xsl: {
    title: "books.xsl",
    code: `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <!-- List the book titles -->
  <xsl:template match="/">
    <xsl:for-each select="books/book">
      <p><xsl:value-of select="title" /></p>
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>`,
  },
  yaml: {
    title: "config.yaml",
    code: `# The service settings
name: api
port: 8080
debug: false
tags:
  - web
  - public`,
  },
  zenscript: {
    title: "recipes.zs",
    code: `// Craft a diamond from coal
recipes.addShaped(<minecraft:diamond>, [
    [<minecraft:coal>, <minecraft:coal>],
    [<minecraft:coal>, <minecraft:coal>]
]);`,
  },
  zig: {
    title: "main.zig",
    code: `const std = @import("std");

// Print the greeting
pub fn main() void {
    const count: u32 = 3;
    std.debug.print("Hello, Zig {d}\\n", .{count});
}`,
  },
};

/**
 * Complete specs for the most popular languages that show more features of the editor:
 * tabs, several windows, popovers, highlighted lines, marks and aspect ratios.
 */
export const SHOWCASE_EXAMPLES: Array<{ name: string; language: string; spec: SpecInput }> = [
  {
    name: "Function and test",
    language: "typescript",
    spec: {
      windows: [
        {
          tabs: true,
          titleBar: false,
          panes: [
            {
              title: "total.ts",
              code: `/** Adds the prices of the items in the cart */
export function total(items: Array<{ price: number }>): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}`,
            },
            {
              title: "total.test.ts",
              code: `import { expect, test } from "vitest";
import { total } from "./total";

test("adds the prices", () => {
  const items = [{ price: 3 }, { price: 4 }];
  expect(total(items)).toBe(7);
});`,
              highlight: [6],
              marks: [{ line: 6, match: "7", style: "strong", color: "#22c55e" }],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Type on hover",
    language: "typescript",
    spec: {
      aspectRatio: "16:9",
      windows: [
        {
          panes: [
            {
              title: "handler.ts",
              code: `import { getUser } from "./db";

export async function handler(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const user = await getUser(id!);
  return Response.json({ name: user.name });
}`,
              annotations: [
                {
                  line: 5,
                  match: "user",
                  code: `const user: {
    id: string;
    name: string;
    plan: "free" | "pro";
}`,
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Main thread and worker",
    language: "javascript",
    spec: {
      direction: "row",
      windows: [
        {
          panes: [
            {
              title: "main.js",
              code: `const worker = new Worker("./worker.js");

worker.postMessage({ numbers: [1, 2, 3] });
worker.onmessage = (event) => {
  console.log("Sum:", event.data);
};`,
              highlight: [3],
              marks: [{ line: 3, match: "postMessage", color: "#fcd34d" }],
            },
          ],
        },
        {
          panes: [
            {
              title: "worker.js",
              code: `self.onmessage = (event) => {
  const sum = event.data.numbers.reduce((a, b) => a + b, 0);
  self.postMessage(sum);
};`,
              highlight: [3],
              marks: [{ line: 3, match: "postMessage", color: "#fcd34d" }],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Component and styles",
    language: "tsx",
    spec: {
      windows: [
        {
          tabs: true,
          titleBar: false,
          panes: [
            {
              title: "Button.tsx",
              code: `import "./button.css";

type Props = { label: string; onClick: () => void };

export function Button({ label, onClick }: Props) {
  return (
    <button className="button" onClick={onClick}>
      {label}
    </button>
  );
}`,
              marks: [{ line: 7, match: 'className="button"', background: "#6366f140" }],
            },
            {
              title: "button.css",
              code: `.button {
  padding: 8px 16px;
  border-radius: 9999px;
  color: white;
  background: #6366f1;
}`,
              marks: [{ line: 1, match: ".button", background: "#6366f140" }],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Function and test",
    language: "python",
    spec: {
      windows: [
        {
          tabs: true,
          titleBar: false,
          panes: [
            {
              title: "slug.py",
              code: `import re


def slugify(title: str) -> str:
    """Turns a title into a part of a URL."""
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower())
    return slug.strip("-")`,
              marks: [{ line: 6, match: 'r"[^a-z0-9]+"', color: "#f472b6" }],
            },
            {
              title: "test_slug.py",
              code: `from slug import slugify


def test_slugify():
    assert slugify("Hello, World!") == "hello-world"`,
              highlight: [5],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Data class on hover",
    language: "python",
    spec: {
      aspectRatio: "1:1",
      windows: [
        {
          panes: [
            {
              title: "order.py",
              code: `from dataclasses import dataclass


@dataclass
class Order:
    id: int
    items: list[str]
    paid: bool = False


order = Order(id=1, items=["book"])`,
              highlight: [4],
              annotations: [
                {
                  line: 11,
                  match: "Order",
                  code: "(id: int, items: list[str], paid: bool = False) -> Order",
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Function and unit test",
    language: "rust",
    spec: {
      windows: [
        {
          panes: [
            {
              title: "lib.rs",
              code: `/// Returns the word count of a text
pub fn word_count(text: &str) -> usize {
    text.split_whitespace().count()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_words() {
        assert_eq!(word_count("hello tin world"), 3);
    }
}`,
              highlight: ["11-13"],
              annotations: [{ line: 3, match: "count", code: "pub fn count(self) -> usize" }],
            },
          ],
        },
      ],
    },
  },
  {
    name: "HTTP server",
    language: "go",
    spec: {
      windows: [
        {
          panes: [
            {
              title: "main.go",
              code: `package main

import (
    "encoding/json"
    "net/http"
)

func health(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func main() {
    http.HandleFunc("/health", health)
    http.ListenAndServe(":8080", nil)
}`,
              highlight: [14],
              annotations: [
                {
                  line: 15,
                  match: "ListenAndServe",
                  code: "func http.ListenAndServe(addr string, handler http.Handler) error",
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Record and its use",
    language: "java",
    spec: {
      direction: "row",
      windows: [
        {
          panes: [
            {
              title: "Point.java",
              code: `public record Point(int x, int y) {
    public Point {
        if (x < 0 || y < 0) throw new IllegalArgumentException("negative");
    }

    public double length() {
        return Math.sqrt(x * x + y * y);
    }
}`,
              highlight: ["6-8"],
            },
          ],
        },
        {
          panes: [
            {
              title: "Main.java",
              code: `public class Main {
    public static void main(String[] args) {
        var point = new Point(3, 4);
        System.out.println(point.length()); // 5.0
    }
}`,
              marks: [{ line: 4, match: "// 5.0", style: "strong", color: "#22c55e" }],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Sealed result",
    language: "kotlin",
    spec: {
      aspectRatio: "16:9",
      windows: [
        {
          panes: [
            {
              title: "Result.kt",
              code: `sealed interface Result<out T> {
    data class Ok<T>(val value: T) : Result<T>
    data class Error(val message: String) : Result<Nothing>
}

fun <T> Result<T>.describe(): String = when (this) {
    is Result.Ok -> "Value: $value"
    is Result.Error -> "Failed: $message"
}`,
              highlight: ["7-8"],
              marks: [{ line: 1, match: "sealed", style: "strong", color: "#c084fc" }],
            },
          ],
        },
      ],
    },
  },
  {
    name: "SwiftUI view",
    language: "swift",
    spec: {
      aspectRatio: "1:1",
      windows: [
        {
          panes: [
            {
              title: "CounterView.swift",
              code: `import SwiftUI

struct CounterView: View {
    @State private var count = 0

    var body: some View {
        Button("Clicked \\(count) times") {
            count += 1
        }
        .buttonStyle(.borderedProminent)
    }
}`,
              annotations: [
                {
                  line: 4,
                  match: "@State",
                  code: "@frozen @propertyWrapper\nstruct State<Value>",
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Header and source",
    language: "c",
    spec: {
      windows: [
        {
          tabs: true,
          titleBar: false,
          panes: [
            {
              title: "vec.h",
              code: `#ifndef VEC_H
#define VEC_H

typedef struct {
    float x, y;
} Vec2;

float vec2_length(Vec2 v);

#endif`,
              highlight: [8],
            },
            {
              title: "vec.c",
              code: `#include <math.h>
#include "vec.h"

float vec2_length(Vec2 v) {
    return sqrtf(v.x * v.x + v.y * v.y);
}`,
              highlight: [4],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Before and after",
    language: "cpp",
    spec: {
      windows: [
        {
          tabs: true,
          titleBar: false,
          panes: [
            {
              title: "before.cpp",
              code: `int total = 0;
for (size_t i = 0; i < prices.size(); i++) {
    total += prices[i];
}`,
              marks: [{ line: 2, match: "for", style: "strikethrough", color: "#f43f5e" }],
            },
            {
              title: "after.cpp",
              code: `#include <numeric>

int total = std::accumulate(prices.begin(), prices.end(), 0);`,
              marks: [{ line: 3, match: "std::accumulate", background: "#22c55e40" }],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Minimal API",
    language: "csharp",
    spec: {
      aspectRatio: "16:9",
      windows: [
        {
          panes: [
            {
              title: "Program.cs",
              code: `var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/todos/{id}", (int id, TodoDb db) =>
    db.Todos.Find(id) is Todo todo ? Results.Ok(todo) : Results.NotFound());

app.Run();`,
              annotations: [
                {
                  line: 4,
                  match: "TodoDb",
                  code: `class TodoDb : DbContext
{
    public DbSet<Todo> Todos { get; }
}`,
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Route and controller",
    language: "php",
    spec: {
      windows: [
        {
          tabs: true,
          titleBar: false,
          panes: [
            {
              title: "web.php",
              code: `<?php

use App\\Http\\Controllers\\PostController;
use Illuminate\\Support\\Facades\\Route;

Route::get('/posts/{post}', [PostController::class, 'show']);`,
              highlight: [6],
            },
            {
              title: "PostController.php",
              code: `<?php

namespace App\\Http\\Controllers;

use App\\Models\\Post;

class PostController extends Controller
{
    public function show(Post $post)
    {
        return view('posts.show', ['post' => $post]);
    }
}`,
              highlight: ["9-12"],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Class and spec",
    language: "ruby",
    spec: {
      windows: [
        {
          tabs: true,
          titleBar: false,
          panes: [
            {
              title: "stack.rb",
              code: `class Stack
  def initialize = @items = []

  def push(item)
    @items.push(item)
    self
  end

  def pop = @items.pop
end`,
            },
            {
              title: "stack_spec.rb",
              code: `require_relative "stack"

RSpec.describe Stack do
  it "returns the last item" do
    stack = Stack.new.push(1).push(2)
    expect(stack.pop).to eq(2)
  end
end`,
              highlight: [6],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Table and query",
    language: "sql",
    spec: {
      windows: [
        {
          panes: [
            {
              title: "001_create_orders.sql",
              code: `CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers (id),
  total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
            },
          ],
        },
        {
          panes: [
            {
              title: "top_customers.sql",
              code: `-- The five customers who spent the most
SELECT customer_id, SUM(total) AS spent
FROM orders
GROUP BY customer_id
ORDER BY spent DESC
LIMIT 5;`,
              marks: [{ line: 2, match: "SUM(total)", style: "strong", color: "#fcd34d" }],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Release script",
    language: "shellscript",
    spec: {
      aspectRatio: "16:9",
      windows: [
        {
          panes: [
            {
              title: "release.sh",
              code: `#!/usr/bin/env bash
set -euo pipefail

version="$1"
echo "Releasing v$version"

git tag "v$version"
git push origin "v$version"
npm publish --access public`,
              highlight: [9],
              marks: [{ line: 2, match: "set -euo pipefail", background: "#fcd34d40" }],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Page and styles",
    language: "html",
    spec: {
      windows: [
        {
          tabs: true,
          titleBar: false,
          panes: [
            {
              title: "index.html",
              code: `<!doctype html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="hero">
      <h1>Ship faster</h1>
      <a class="cta" href="/start">Get started</a>
    </main>
  </body>
</html>`,
              marks: [{ line: 9, match: 'class="cta"', background: "#22c55e40" }],
            },
            {
              title: "styles.css",
              code: `.hero {
  display: grid;
  place-items: center;
  min-height: 100vh;
}

.cta {
  padding: 12px 24px;
  border-radius: 8px;
  background: #22c55e;
}`,
              marks: [{ line: 7, match: ".cta", background: "#22c55e40" }],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Before and after",
    language: "css",
    spec: {
      windows: [
        {
          tabs: true,
          titleBar: false,
          panes: [
            {
              title: "before.css",
              code: `.center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}`,
              marks: [
                { line: 2, match: "position: absolute", style: "strikethrough", color: "#f43f5e" },
                { line: 5, match: "transform", style: "strikethrough", color: "#f43f5e" },
              ],
            },
            {
              title: "after.css",
              code: `.center {
  display: grid;
  place-items: center;
}`,
              marks: [{ line: 3, match: "place-items: center", background: "#22c55e40" }],
            },
          ],
        },
      ],
    },
  },
  {
    name: "Package manifest",
    language: "json",
    spec: {
      windows: [
        {
          panes: [
            {
              title: "package.json",
              code: `{
  "name": "my-lib",
  "version": "1.2.0",
  "type": "module",
  "exports": "./dist/index.js",
  "scripts": {
    "build": "tsdown",
    "test": "vitest"
  }
}`,
              highlight: [4],
              marks: [{ line: 3, match: "1.2.0", style: "strong", color: "#fcd34d" }],
              annotations: [
                {
                  line: 4,
                  match: "module",
                  language: "text",
                  code: "Files that end in .js load as ES modules.",
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    name: "CI workflow",
    language: "yaml",
    spec: {
      aspectRatio: "1.91:1",
      windows: [
        {
          panes: [
            {
              title: "ci.yml",
              code: `name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm test`,
              highlight: [11],
              marks: [{ line: 6, match: "ubuntu-latest", color: "#38bdf8" }],
            },
          ],
        },
      ],
    },
  },
];
