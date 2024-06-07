import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import axios from "axios";

class SidebarWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "sidebar";

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    const htmlPath = vscode.Uri.file(
      path.join(this._extensionUri.fsPath, "src", "webviews", "sidebar.html")
    );
    const htmlContent = fs.readFileSync(htmlPath.fsPath, "utf-8");

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = htmlContent;

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "showLoginPage":
          if (message.mode === "online") {
            vscode.commands.executeCommand("isldictapp.login");
          }
          break;
        case "showComingSoonPage":
          if (message.mode === "offline") {
            vscode.commands.executeCommand("isldictapp.comingSoon");
          }
          break;
      }
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Register the webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarWebviewProvider.viewType,
      new SidebarWebviewProvider(context.extensionUri)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.showSidebar", () => {
      vscode.commands.executeCommand("workbench.view.extension.sidebar");
    })
  );

  // Register the command for the login process
  context.subscriptions.push(
    vscode.commands.registerCommand("isldictapp.login", async () => {
      // Create a new webview panel for the login
      const panel = vscode.window.createWebviewPanel(
        "login",
        "Login",
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      const htmlPath = vscode.Uri.file(
        path.join(context.extensionPath, "src", "webviews", "login.html")
      );
      const htmlContent = fs.readFileSync(htmlPath.fsPath, "utf-8");
      panel.webview.html = htmlContent;

      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case "login":
            if (message.username && message.password) {
              try {
                const response = await axios.get(
                  `https://islstagingapi.vachanengine.org/v2/user/login?user_email=${message.username}&password=${message.password}`
                );
                const token = response.data.token;
                console.log("Token received:", token);
                context.globalState.update("token", token);

                // Load a new webview content with the token
                const dashboardHtmlPath = vscode.Uri.file(
                  path.join(
                    context.extensionPath,
                    "src",
                    "webviews",
                    "dictionaryPage.html"
                  )
                );
                const dashboardHtmlContent = fs
                  .readFileSync(dashboardHtmlPath.fsPath, "utf-8")
                  .replace("{{myVariable}}", token);
                panel.webview.html = dashboardHtmlContent;
                panel.webview.postMessage({ command: "setToken", token });
              } catch (error) {
                console.error("Login failed:", error);
              }
            } else {
              vscode.window.showErrorMessage(
                "Please enter both username and password."
              );
            }
            break;
        }
      });
    })
  );

  // Register the command for the coming soon page
  context.subscriptions.push(
    vscode.commands.registerCommand("isldictapp.comingSoon", async () => {
      // Create a new webview panel for the coming soon page
      const panel = vscode.window.createWebviewPanel(
        "comingSoon",
        "Coming Soon",
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      const htmlPath = vscode.Uri.file(
        path.join(context.extensionPath, "src", "webviews", "comingSoon.html")
      );
      const htmlContent = fs.readFileSync(htmlPath.fsPath, "utf-8");
      panel.webview.html = htmlContent;
    })
  );

  // Show the login page by default
  vscode.commands.executeCommand("isldictapp.login");
}

export function deactivate() {}
