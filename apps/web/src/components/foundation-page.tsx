import { useQuery } from "convex/react"
import { Link } from "@tanstack/react-router"

import { api } from "@lyrx/backend/convex/_generated/api"
import { PRODUCT_NAME } from "@lyrx/shared"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { Spinner } from "@lyrx/ui/components/spinner"

import { authClient } from "@/lib/auth-client"
import { getPublicRuntimeConfig } from "@/lib/runtime-config"

export function FoundationPage() {
  return (
    <main className="min-h-svh">
      <section className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-8 px-6 py-16 sm:py-24">
        <Badge variant="outline">Comptes et profils</Badge>
        <div className="flex flex-col gap-3">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            {PRODUCT_NAME}
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            L’authentification sécurisée, le choix Fan ou Artiste et les profils
            constituent la deuxième fondation du produit.
          </p>
        </div>
        {getPublicRuntimeConfig() ? (
          <ConfiguredAccountCard />
        ) : (
          <MissingBackend />
        )}
      </section>
    </main>
  )
}

function MissingBackend() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Backend prêt à être relié</CardTitle>
        <CardDescription>
          Le code Convex et Better Auth est présent, mais aucun déploiement de
          développement n’est configuré dans ce checkout.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MissingBackendNotice />
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link to="/auth/sign-in">Voir les parcours de compte</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export function MissingBackendNotice() {
  return (
    <Alert>
      <AlertTitle>Aucune intégration simulée</AlertTitle>
      <AlertDescription>
        Aucun déploiement n’est relié. Les parcours Google et email restent
        annoncés indisponibles tant que leurs variables et secrets ne sont pas
        fournis.
      </AlertDescription>
    </Alert>
  )
}

function ConfiguredAccountCard() {
  const current = useQuery(api.members.current, {})
  if (current === undefined) return <Spinner />

  if (current.state === "anonymous") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bienvenue</CardTitle>
          <CardDescription>
            La lecture publique reste ouverte. Connectez-vous pour préparer
            votre profil de contribution.
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button asChild>
            <Link to="/auth/sign-in">Se connecter</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth/sign-up">Créer un compte</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (current.state === "email-unverified") {
    return (
      <Alert>
        <AlertTitle>Email à vérifier</AlertTitle>
        <AlertDescription>
          Vérifiez votre adresse avant de créer un profil.{" "}
          <Link to="/auth/verify-email">Renvoyer le lien</Link>
        </AlertDescription>
      </Alert>
    )
  }

  if (current.state === "onboarding-required") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choisissez votre rôle</CardTitle>
          <CardDescription>
            Finalisez votre profil Fan ou Artiste.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <Link to="/onboarding">Continuer</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (current.state === "suspended") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Compte suspendu</AlertTitle>
        <AlertDescription>
          L’accès aux fonctions de contribution et au profil public est
          suspendu.
        </AlertDescription>
      </Alert>
    )
  }

  async function signOut() {
    await authClient.signOut()
    window.location.assign("/")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bonjour {current.profile.displayName}</CardTitle>
        <CardDescription>
          Profil {current.member.role === "artist" ? "Artiste" : "Fan"} · @
          {current.profile.handle}
        </CardDescription>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button asChild>
          <Link to="/profile">Mon profil</Link>
        </Button>
        <Button type="button" variant="outline" onClick={signOut}>
          Se déconnecter
        </Button>
      </CardFooter>
    </Card>
  )
}
