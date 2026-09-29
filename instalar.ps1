# Instalador do MEUCHAT — publica o sistema na conta da própria pessoa.
#
# Roda no PowerShell que já vem no Windows. Não instala nada: fala direto com
# as APIs do GitHub e da Vercel. Existe porque a parte de publicar era vinte
# minutos de cliques em telas que mudam de lugar, e agora é uma linha.
#
# O que ele NÃO faz, de propósito: criar contas, fazer login e mexer no portal
# do Meta. Isso é credencial pessoal, e quem digita é a dona da conta.
#
# Uso:
#   irm https://raw.githubusercontent.com/rafaneaime/rafa-automacao/main/instalar.ps1 | iex

$ErrorActionPreference = 'Stop'

function Titulo($texto) { Write-Host ""; Write-Host "== $texto" }
function Passo($texto)  { Write-Host "   $texto" }
function Erro($texto)   { Write-Host ""; Write-Host "PROBLEMA: $texto"; exit 1 }

function PerguntaSecreta($rotulo) {
  $segura = Read-Host -Prompt "   $rotulo" -AsSecureString
  $texto = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($segura))
  if ([string]::IsNullOrWhiteSpace($texto)) { Erro "$rotulo não pode ficar em branco." }
  return $texto.Trim()
}

function Pergunta($rotulo) {
  $texto = Read-Host -Prompt "   $rotulo"
  if ([string]::IsNullOrWhiteSpace($texto)) { Erro "$rotulo não pode ficar em branco." }
  return $texto.Trim()
}

# 48 caracteres de acaso. Serve para o VERIFY_TOKEN e para o CRON_SECRET, que
# ninguém precisa inventar nem decorar.
function Segredo {
  $alfabeto = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  -join ((1..48) | ForEach-Object { $alfabeto[(Get-Random -Maximum $alfabeto.Length)] })
}

function ChamarApi($metodo, $url, $cabecalhos, $corpo) {
  try {
    $parametros = @{ Method = $metodo; Uri = $url; Headers = $cabecalhos; ErrorAction = 'Stop' }
    if ($null -ne $corpo) {
      $parametros.Body = ($corpo | ConvertTo-Json -Depth 10 -Compress)
      $parametros.ContentType = 'application/json'
    }
    return Invoke-RestMethod @parametros
  } catch {
    $resposta = $_.ErrorDetails.Message
    if (-not $resposta) { $resposta = $_.Exception.Message }
    Erro "a chamada para $url falhou. O serviço respondeu: $resposta"
  }
}

Write-Host ""
Write-Host "Instalador do MEUCHAT"
Write-Host "Publica o sistema na SUA conta. Nada fica na conta de outra pessoa."
Write-Host ""
Write-Host "Antes de comecar voce precisa ter, nesta ordem:"
Write-Host "  1. o app do Instagram criado no portal do Meta, com o token gerado"
Write-Host "  2. um projeto no Neon, com a connection string copiada"
Write-Host "  3. um token do GitHub e um token da Vercel (o passo a passo explica)"
Write-Host ""

Titulo "As duas chaves temporarias"
Passo "Elas autorizam este instalador a criar o repositorio e publicar."
Passo "Ao terminar, voce revoga as duas. O texto colado nao aparece na tela."
$tokenGitHub = PerguntaSecreta "Token do GitHub"
$tokenVercel = PerguntaSecreta "Token da Vercel"

Titulo "Os dados do seu sistema"
$conexaoBanco = PerguntaSecreta "Connection string do Neon"
$igAppId      = Pergunta "IG_APP_ID (numero do app do Instagram)"
$igAppSecret  = PerguntaSecreta "IG_APP_SECRET"
$accessToken  = PerguntaSecreta "ACCESS_TOKEN (o token gerado no portal)"
$senhaPainel  = PerguntaSecreta "Senha que voce quer usar para entrar no painel"
$emailContato = Pergunta "E-mail de contato (aparece na politica de privacidade)"

$verifyToken = Segredo
$cronSecret  = Segredo

$cabecalhoGitHub = @{
  Authorization = "Bearer $tokenGitHub"
  Accept        = 'application/vnd.github+json'
  'User-Agent'  = 'instalador-meuchat'
}
$cabecalhoVercel = @{ Authorization = "Bearer $tokenVercel" }

Titulo "Conferindo as chaves"
$usuario = ChamarApi 'GET' 'https://api.github.com/user' $cabecalhoGitHub $null
Passo "GitHub: $($usuario.login)"
$eu = ChamarApi 'GET' 'https://api.vercel.com/v2/user' $cabecalhoVercel $null
Passo "Vercel: $($eu.user.username)"

$nomeRepo = 'meu-chat'
$nomeProjeto = 'meu-chat'

Titulo "Criando a sua copia do codigo"
$copia = ChamarApi 'POST' 'https://api.github.com/repos/rafaneaime/rafa-automacao/generate' $cabecalhoGitHub @{
  owner = $usuario.login; name = $nomeRepo; private = $true
  description = 'Minha instalacao do MEUCHAT'
}
Passo "repositorio: $($copia.full_name)"

Titulo "Criando o projeto na Vercel"
$projeto = ChamarApi 'POST' 'https://api.vercel.com/v11/projects' $cabecalhoVercel @{
  name = $nomeProjeto
  framework = 'nextjs'
  gitRepository = @{ type = 'github'; repo = $copia.full_name }
}
Passo "projeto: $($projeto.name)"

Titulo "Guardando as variaveis"
$variaveis = @(
  @{ key = 'IG_APP_ID';      value = $igAppId },
  @{ key = 'IG_APP_SECRET';  value = $igAppSecret },
  @{ key = 'VERIFY_TOKEN';   value = $verifyToken },
  @{ key = 'ACCESS_TOKEN';   value = $accessToken },
  @{ key = 'DATABASE_URL';   value = $conexaoBanco },
  @{ key = 'PANEL_PASSWORD'; value = $senhaPainel },
  @{ key = 'CRON_SECRET';    value = $cronSecret },
  @{ key = 'EMAIL_CONTATO';  value = $emailContato }
) | ForEach-Object { @{ key = $_.key; value = $_.value; type = 'encrypted'; target = @('production') } }

ChamarApi 'POST' "https://api.vercel.com/v10/projects/$($projeto.id)/env?upsert=true" $cabecalhoVercel $variaveis | Out-Null
Passo "$($variaveis.Count) variaveis gravadas"

Titulo "Publicando"
$publicacao = ChamarApi 'POST' 'https://api.vercel.com/v13/deployments' $cabecalhoVercel @{
  name = $nomeProjeto
  project = $projeto.id
  target = 'production'
  gitSource = @{ type = 'github'; repoId = $copia.id; ref = 'main' }
}
Passo "comecou. Isso leva um ou dois minutos."

$estado = ''
for ($tentativa = 1; $tentativa -le 90; $tentativa++) {
  Start-Sleep -Seconds 5
  $situacao = ChamarApi 'GET' "https://api.vercel.com/v13/deployments/$($publicacao.id)" $cabecalhoVercel $null
  $estado = $situacao.readyState
  if ($estado -eq 'READY' -or $estado -eq 'ERROR' -or $estado -eq 'CANCELED') { break }
}

if ($estado -ne 'READY') {
  Erro "a publicacao terminou como $estado. Abra vercel.com, entre no projeto $nomeProjeto, aba Deployments, e me mande a ultima linha do log."
}

# O endereco CURTO, e nao o da publicacao.
#
# Cada publicacao ganha um endereco proprio, com letras embaralhadas no meio
# (...-9265f73td-...). Ele funciona hoje e para de funcionar na proxima
# publicacao — e quem colou esse no webhook do Meta descobre dias depois, com
# a automacao muda e nenhuma mensagem de erro. O endereco do projeto nao muda.
$dados = ChamarApi 'GET' "https://api.vercel.com/v9/projects/$($projeto.id)" $cabecalhoVercel $null
$curto = $dados.targets.production.alias | Where-Object { $_ -eq "$nomeProjeto.vercel.app" } | Select-Object -First 1
if (-not $curto) {
  $curto = $dados.targets.production.alias | Sort-Object Length | Select-Object -First 1
}
if (-not $curto) { Erro "a publicacao terminou, mas a Vercel nao devolveu o endereco do projeto. Abra vercel.com e pegue o endereco na tela do projeto." }
$endereco = "https://$curto"

Titulo "Pronto"
Write-Host ""
Write-Host "   Seu painel:      $endereco"
Write-Host "   Entre com a senha que voce escolheu agora ha pouco."
Write-Host ""
Write-Host "   Falta so o webhook, no portal do Meta. Cole estes dois valores:"
Write-Host ""
Write-Host "   Callback URL:    $endereco/api/webhook"
Write-Host "   Verify Token:    $verifyToken"
Write-Host ""
Write-Host "   Guarde o Verify Token: ele nao aparece de novo nesta tela."
Write-Host "   Depois de assinar os campos do webhook, comente na sua publicacao"
Write-Host "   com a segunda conta do Instagram para testar."
Write-Host ""
Write-Host "   Agora pode revogar os dois tokens que voce colou no comeco."
Write-Host ""
