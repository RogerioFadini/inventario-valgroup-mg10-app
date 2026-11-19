# -*- coding: utf-8 -*-
"""Envia/atualiza o GitHub deste projeto com o token guardado CRIPTOGRAFADO (DPAPI do Windows).

  python push_github.py            -> traz o que houver no GitHub (rebase) e envia os commits locais
  python push_github.py --salvar   -> pede o token (sem aparecer na tela) e guarda criptografado

O token fica em `.token_github.dpapi`, só abre nesta conta do Windows e nunca vai ao GitHub (está no
.gitignore). Também não fica na URL do `origin` nem no gerenciador de credenciais do Windows.
Mesmo esquema do push_github.py da Automação de Relatórios."""
import os, sys, subprocess, getpass
import win32crypt

AQUI = os.path.dirname(os.path.abspath(__file__))
ARQ = os.path.join(AQUI, ".token_github.dpapi")
REPO = "RogerioFadini/inventario-valgroup-mg10-app"
ENTROPIA = b"INVENTARIO_MG10_GITHUB"


def salvar(token):
    blob = win32crypt.CryptProtectData(token.strip().encode("utf-8"), "GitHub_Inventario", ENTROPIA, None, None, 0x1)
    with open(ARQ, "wb") as f:
        f.write(blob)


def ler():
    with open(ARQ, "rb") as f:
        return win32crypt.CryptUnprotectData(f.read(), ENTROPIA, None, None, 0x1)[1].decode("utf-8")


def git(*args, token=""):
    r = subprocess.run(["git", *args], cwd=AQUI, capture_output=True, text=True, env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
    saida = (r.stdout + r.stderr).strip()
    return r.returncode, (saida.replace(token, "TOKEN") if token else saida)


if __name__ == "__main__":
    if "--salvar" in sys.argv:
        salvar(getpass.getpass("Token do GitHub (não aparece): "))
        print("Token guardado criptografado em", ARQ)
        sys.exit(0)
    tk = ler()
    url = f"https://x-access-token:{tk}@github.com/{REPO}.git"
    rc, out = git("fetch", url, "main", token=tk); print(out)
    if rc: sys.exit(rc)
    rc, out = git("rebase", "FETCH_HEAD"); print(out)
    if rc:
        git("rebase", "--abort"); print("Conflito no rebase: cancelado, nada foi enviado."); sys.exit(rc)
    rc, out = git("push", url, "HEAD:main", token=tk); print(out)
    if rc == 0:
        git("update-ref", "refs/remotes/origin/main", "HEAD")
    sys.exit(rc)
