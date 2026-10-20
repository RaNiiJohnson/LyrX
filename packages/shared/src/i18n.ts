import type { SupportedLocale } from "./index"

const frenchMessages = {
  "common.admin": "Administrateur",
  "common.artist": "Artiste",
  "common.fan": "Fan",
  "common.loadingAccount": "Chargement du compte",
  "common.loadingOnboarding": "Chargement de l’onboarding",
  "common.loadingProfile": "Chargement du profil",
  "common.loadingPublicProfile": "Chargement du profil public",
  "common.profile": "Profil",
  "auth.actionError": "Action impossible",
  "auth.email": "Adresse email",
  "auth.emailInvalid": "Adresse email invalide.",
  "auth.emailUnavailableDescription":
    "La connexion reste disponible pour un compte déjà vérifié. Les nouveaux emails de vérification et de réinitialisation nécessitent encore le fournisseur transactionnel.",
  "auth.emailUnavailableTitle": "Envoi d’emails non configuré",
  "auth.googleConfigured": "Google est configuré pour ce déploiement.",
  "auth.googleContinue": "Continuer avec Google",
  "auth.googleLoading": "Chargement de Google",
  "auth.googlePendingConfiguration":
    "Google sera activé lorsque les identifiants OAuth seront configurés.",
  "auth.or": "ou",
  "auth.password": "Mot de passe",
  "auth.passwordMinimum": "10 caractères minimum.",
  "auth.passwordRequired": "Le mot de passe est requis.",
  "auth.passwordTooShort":
    "Le mot de passe doit contenir au moins 10 caractères.",
  "auth.requestRecorded": "Demande enregistrée",
  "backend.requiredDescription":
    "Ajoutez VITE_CONVEX_URL, VITE_CONVEX_SITE_URL et VITE_SITE_URL dans apps/web/.env.local après avoir configuré le déploiement de développement. Aucun fournisseur externe n’est simulé.",
  "backend.requiredTitle": "Configuration Convex requise",
  "forgot.description":
    "Recevez un lien à usage limité pour choisir un nouveau mot de passe.",
  "forgot.deliveryUnavailableDescription":
    "Le fournisseur d’email doit être configuré avant d’utiliser ce parcours.",
  "forgot.deliveryUnavailableTitle": "Envoi indisponible",
  "forgot.footer": "Revenir à la connexion",
  "forgot.notice":
    "Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé.",
  "forgot.submit": "Envoyer le lien",
  "forgot.successDescription": "Consultez votre boîte email.",
  "forgot.successTitle": "Demande envoyée",
  "forgot.title": "Mot de passe oublié",
  "reset.confirm": "Confirmer",
  "reset.description": "Le changement révoque les autres sessions du compte.",
  "reset.footer": "Aller à la connexion",
  "reset.incompleteDescription":
    "Le jeton de réinitialisation est absent. Demandez un nouveau lien.",
  "reset.incompleteTitle": "Lien incomplet",
  "reset.mismatch": "Les deux mots de passe ne correspondent pas.",
  "reset.newPassword": "Nouveau mot de passe",
  "reset.notice": "Le mot de passe a été modifié. Vous pouvez vous connecter.",
  "reset.submit": "Enregistrer le mot de passe",
  "reset.success": "Mot de passe modifié",
  "reset.title": "Nouveau mot de passe",
  "reset.updateError": "Mot de passe non modifié",
  "signIn.description":
    "Retrouvez votre profil Lyr’X et vos outils de contribution.",
  "signIn.error": "Connexion impossible",
  "signIn.forgotPassword": "Mot de passe oublié ?",
  "signIn.footerLead": "Pas encore de compte ?",
  "signIn.submit": "Se connecter",
  "signIn.title": "Connexion",
  "signUp.description":
    "L’inscription est suivie d’une vérification email puis du choix Fan ou Artiste.",
  "signUp.displayName": "Nom affiché",
  "signUp.emailDeliveryDescription":
    "Le fournisseur d’email transactionnel n’est pas encore configuré. Lyr’X ne crée pas de compte impossible à vérifier.",
  "signUp.emailDeliveryTitle": "Inscription temporairement indisponible",
  "signUp.error": "Création du compte impossible",
  "signUp.footerLead": "Déjà membre ?",
  "signUp.nameTooShort": "Le nom doit contenir au moins 2 caractères.",
  "signUp.notice":
    "Consultez votre boîte email et ouvrez le lien de vérification avant de choisir votre rôle.",
  "signUp.submit": "Créer mon compte",
  "signUp.successDescription": "Consultez votre boîte email pour le vérifier.",
  "signUp.successTitle": "Compte créé",
  "signUp.title": "Créer un compte",
  "toast.googleError": "Connexion avec Google impossible",
  "toast.sendError": "Envoi impossible",
  "verify.description":
    "Ouvrez le lien reçu pour activer les fonctions réservées aux membres.",
  "verify.deliveryUnavailableDescription":
    "Le fournisseur transactionnel n’est pas configuré pour ce déploiement.",
  "verify.deliveryUnavailableTitle": "Nouvel envoi indisponible",
  "verify.notice":
    "Si cette adresse correspond à un compte, un nouveau lien a été envoyé.",
  "verify.submit": "Renvoyer l’email",
  "verify.successTitle": "Nouvel email demandé",
  "verify.title": "Vérifier votre email",
  "home.accountBadge": "Comptes et profils",
  "home.backendDescription":
    "Le code Convex et Better Auth est présent, mais aucun déploiement de développement n’est configuré dans ce checkout.",
  "home.backendTitle": "Backend prêt à être relié",
  "home.backendAction": "Voir les parcours de compte",
  "home.backendNoticeDescription":
    "Aucun déploiement n’est relié. Les parcours Google et email restent indisponibles tant que leurs variables et secrets ne sont pas fournis.",
  "home.backendNoticeTitle": "Aucune intégration simulée",
  "home.description":
    "Un studio chaleureux pour lire, comprendre et partager les paroles qui nous rassemblent.",
  "home.emailUnverifiedDescription":
    "Vérifiez votre adresse avant de créer un profil.",
  "home.emailUnverifiedLink": "Renvoyer le lien",
  "home.emailUnverifiedTitle": "Email à vérifier",
  "home.eyebrow": "Le studio des paroles",
  "home.featureCommunityDescription":
    "Des profils Fan et Artiste pour contribuer avec un rôle clair.",
  "home.featureCommunityTitle": "Une communauté lisible",
  "home.featureLyricsDescription":
    "Une expérience éditoriale conçue pour la lecture longue, de jour comme de nuit.",
  "home.featureLyricsTitle": "Les paroles au premier plan",
  "home.featureMeaningDescription":
    "Le futur espace pour comprendre les références et le contexte des chansons.",
  "home.featureMeaningTitle": "Plus près du sens",
  "home.heroAction": "Créer mon espace",
  "home.heroSecondaryAction": "Se connecter",
  "home.title": "Les paroles méritent mieux qu’une simple page de texte.",
  "home.onboardingDescription": "Finalisez votre profil Fan ou Artiste.",
  "home.onboardingTitle": "Choisissez votre rôle",
  "home.readyDescription": "Profil {{role}} · @{{handle}}",
  "home.readyGreeting": "Bonjour {{name}}",
  "home.suspendedDescription":
    "L’accès aux fonctions de contribution et au profil public est suspendu.",
  "home.suspendedTitle": "Compte suspendu",
  "home.welcomeDescription":
    "La lecture publique reste ouverte. Connectez-vous pour préparer votre profil de contribution.",
  "home.welcomeTitle": "Bienvenue",
  "locale.english": "English",
  "locale.french": "Français",
  "meta.description":
    "Le studio musical Lyr’X pour lire, comprendre et partager les paroles.",
  "meta.title": "Lyr’X — Le studio des paroles",
  "navigation.account": "Compte",
  "navigation.closeMenu": "Fermer le menu",
  "navigation.continue": "Continuer",
  "navigation.createAccount": "Créer un compte",
  "navigation.home": "Accueil",
  "navigation.menu": "Menu",
  "navigation.myProfile": "Mon profil",
  "navigation.openMenu": "Ouvrir le menu",
  "navigation.signIn": "Connexion",
  "navigation.signOut": "Se déconnecter",
  "notFound.description": "Cette adresse ne correspond à aucune page de Lyr’X.",
  "notFound.title": "Page introuvable",
  "onboarding.adminNotice":
    "L’administration reste un droit distinct attribué uniquement côté serveur.",
  "onboarding.alreadyDescription": "Votre rôle est {{role}}.",
  "onboarding.alreadyEdit": "Modifier mon profil",
  "onboarding.alreadyTitle": "Profil déjà créé",
  "onboarding.artistProfile": "Profil artiste",
  "onboarding.bio": "Bio",
  "onboarding.create": "Créer mon profil",
  "onboarding.description":
    "Le rôle organise votre expérience. Il ne donne ni badge vérifié ni propriété sur une page artiste existante.",
  "onboarding.emailUnverifiedDescription":
    "Vérifiez {{email}}, puis rechargez cette page. Vous pouvez aussi demander un nouvel email depuis la page de vérification.",
  "onboarding.emailUnverifiedTitle": "Email non vérifié",
  "onboarding.handle": "Pseudo public",
  "onboarding.handleDescription":
    "Lettres minuscules, chiffres, point, tiret ou underscore.",
  "onboarding.handleInvalid":
    "Utilisez 3 à 30 lettres minuscules, chiffres, points, tirets ou underscores.",
  "onboarding.presentation": "Présentation",
  "onboarding.profileCreated": "Profil créé",
  "onboarding.profileError": "Profil non créé",
  "onboarding.role": "Rôle du compte",
  "onboarding.roleDescription":
    "Un artiste peut publier son propre contenu dès les lots catalogue. Un fan peut proposer du contenu à la modération.",
  "onboarding.signInDescription": "Connectez-vous avant de choisir votre rôle.",
  "onboarding.signInTitle": "Connexion nécessaire",
  "onboarding.suspendedDescription":
    "Ce compte ne peut pas créer ou modifier de profil.",
  "preferences.language": "Langue",
  "preferences.theme": "Thème",
  "profile.aboutArtist": "À propos de l’artiste",
  "profile.addLink": "Ajouter un lien",
  "profile.artistIdentity": "Identité artiste",
  "profile.avatar": "Avatar",
  "profile.avatarDescription": "JPEG, PNG ou WebP, 5 Mo maximum.",
  "profile.avatarUpdated": "Avatar mis à jour",
  "profile.banner": "Bannière",
  "profile.bannerDescription": "JPEG, PNG ou WebP, 10 Mo maximum.",
  "profile.bannerUpdated": "Bannière mise à jour",
  "profile.bio": "Bio",
  "profile.customLinkLabel": "Libellé du lien {{number}}",
  "profile.customLinkPlaceholder": "Site officiel",
  "profile.customLinkUrl": "URL du lien {{number}}",
  "profile.customLinks": "Liens personnalisés",
  "profile.handle": "Pseudo",
  "profile.imageError": "Envoi de l’image impossible",
  "profile.imageInvalidResponse": "La réponse du stockage est invalide.",
  "profile.imageUploadFailed": "Le transfert de l’image a échoué.",
  "profile.images": "Images du profil",
  "profile.imageUploading": "Envoi de l’image…",
  "profile.noCustomLinks": "Aucun lien personnalisé.",
  "profile.presentation": "Présentation",
  "profile.publicNotFoundDescription":
    "Ce profil n’existe pas ou n’est pas visible publiquement.",
  "profile.publicNotFoundTitle": "Profil introuvable",
  "profile.removeLink": "Supprimer le lien {{number}}",
  "profile.save": "Enregistrer",
  "profile.saveError": "Modification impossible",
  "profile.saved": "Profil enregistré",
  "profile.suspendedDescription":
    "Ce compte ne peut plus modifier ni publier son profil.",
  "profile.unavailableDescription":
    "Terminez l’onboarding après connexion et vérification de votre email.",
  "profile.unavailableTitle": "Profil indisponible",
  "profile.viewPublic": "Voir le profil public",
  "theme.dark": "Sombre",
  "theme.light": "Clair",
  "theme.system": "Système",
  "toast.signOutError": "Déconnexion impossible",
} as const

export type MessageKey = keyof typeof frenchMessages

const englishMessages = {
  "common.admin": "Administrator",
  "common.artist": "Artist",
  "common.fan": "Fan",
  "common.loadingAccount": "Loading account",
  "common.loadingOnboarding": "Loading onboarding",
  "common.loadingProfile": "Loading profile",
  "common.loadingPublicProfile": "Loading public profile",
  "common.profile": "Profile",
  "auth.actionError": "Action unavailable",
  "auth.email": "Email address",
  "auth.emailInvalid": "Invalid email address.",
  "auth.emailUnavailableDescription":
    "Sign-in remains available for verified accounts. New verification and reset emails still require the transactional email provider.",
  "auth.emailUnavailableTitle": "Email delivery not configured",
  "auth.googleConfigured": "Google is configured for this deployment.",
  "auth.googleContinue": "Continue with Google",
  "auth.googleLoading": "Loading Google",
  "auth.googlePendingConfiguration":
    "Google will be enabled once the OAuth credentials are configured.",
  "auth.or": "or",
  "auth.password": "Password",
  "auth.passwordMinimum": "At least 10 characters.",
  "auth.passwordRequired": "Password is required.",
  "auth.passwordTooShort": "Password must contain at least 10 characters.",
  "auth.requestRecorded": "Request recorded",
  "backend.requiredDescription":
    "Add VITE_CONVEX_URL, VITE_CONVEX_SITE_URL, and VITE_SITE_URL to apps/web/.env.local after configuring the development deployment. No external provider is simulated.",
  "backend.requiredTitle": "Convex configuration required",
  "forgot.description": "Receive a limited-use link to choose a new password.",
  "forgot.deliveryUnavailableDescription":
    "The email provider must be configured before this flow can be used.",
  "forgot.deliveryUnavailableTitle": "Delivery unavailable",
  "forgot.footer": "Back to sign in",
  "forgot.notice":
    "If an account matches this address, a password reset link has been sent.",
  "forgot.submit": "Send the link",
  "forgot.successDescription": "Check your inbox.",
  "forgot.successTitle": "Request sent",
  "forgot.title": "Forgot your password?",
  "reset.confirm": "Confirm password",
  "reset.description": "This change revokes the account’s other sessions.",
  "reset.footer": "Go to sign in",
  "reset.incompleteDescription":
    "The reset token is missing. Request a new link.",
  "reset.incompleteTitle": "Incomplete link",
  "reset.mismatch": "The two passwords do not match.",
  "reset.newPassword": "New password",
  "reset.notice": "Your password was changed. You can now sign in.",
  "reset.submit": "Save password",
  "reset.success": "Password changed",
  "reset.title": "New password",
  "reset.updateError": "Password not changed",
  "signIn.description": "Return to your Lyr’X profile and contribution tools.",
  "signIn.error": "Unable to sign in",
  "signIn.forgotPassword": "Forgot your password?",
  "signIn.footerLead": "New to Lyr’X?",
  "signIn.submit": "Sign in",
  "signIn.title": "Sign in",
  "signUp.description":
    "Registration is followed by email verification and choosing a Fan or Artist role.",
  "signUp.displayName": "Display name",
  "signUp.emailDeliveryDescription":
    "The transactional email provider is not configured yet. Lyr’X will not create an account that cannot be verified.",
  "signUp.emailDeliveryTitle": "Registration temporarily unavailable",
  "signUp.error": "Unable to create the account",
  "signUp.footerLead": "Already a member?",
  "signUp.nameTooShort": "The name must contain at least 2 characters.",
  "signUp.notice":
    "Check your inbox and open the verification link before choosing your role.",
  "signUp.submit": "Create my account",
  "signUp.successDescription": "Check your inbox to verify it.",
  "signUp.successTitle": "Account created",
  "signUp.title": "Create an account",
  "toast.googleError": "Unable to continue with Google",
  "toast.sendError": "Unable to send",
  "verify.description":
    "Open the link you received to enable member-only features.",
  "verify.deliveryUnavailableDescription":
    "The transactional provider is not configured for this deployment.",
  "verify.deliveryUnavailableTitle": "Resending unavailable",
  "verify.notice":
    "If this address matches an account, a new link has been sent.",
  "verify.submit": "Resend the email",
  "verify.successTitle": "New email requested",
  "verify.title": "Verify your email",
  "home.accountBadge": "Accounts and profiles",
  "home.backendDescription":
    "The Convex and Better Auth code is ready, but no development deployment is configured in this checkout.",
  "home.backendTitle": "Backend ready to connect",
  "home.backendAction": "View account flows",
  "home.backendNoticeDescription":
    "No deployment is connected. Google and email flows remain unavailable until their variables and secrets are provided.",
  "home.backendNoticeTitle": "No simulated integration",
  "home.description":
    "A warm studio for reading, understanding, and sharing the lyrics that bring us together.",
  "home.emailUnverifiedDescription":
    "Verify your address before creating a profile.",
  "home.emailUnverifiedLink": "Resend the link",
  "home.emailUnverifiedTitle": "Email verification required",
  "home.eyebrow": "The lyrics studio",
  "home.featureCommunityDescription":
    "Fan and Artist profiles make every contribution role clear.",
  "home.featureCommunityTitle": "A legible community",
  "home.featureLyricsDescription":
    "An editorial experience designed for long-form reading, day or night.",
  "home.featureLyricsTitle": "Lyrics come first",
  "home.featureMeaningDescription":
    "The future place to understand the references and context behind songs.",
  "home.featureMeaningTitle": "Closer to the meaning",
  "home.heroAction": "Create my space",
  "home.heroSecondaryAction": "Sign in",
  "home.title": "Lyrics deserve more than a plain page of text.",
  "home.onboardingDescription": "Finish setting up your Fan or Artist profile.",
  "home.onboardingTitle": "Choose your role",
  "home.readyDescription": "{{role}} profile · @{{handle}}",
  "home.readyGreeting": "Hello {{name}}",
  "home.suspendedDescription":
    "Access to contribution tools and the public profile is suspended.",
  "home.suspendedTitle": "Account suspended",
  "home.welcomeDescription":
    "Public reading stays open. Sign in to prepare your contributor profile.",
  "home.welcomeTitle": "Welcome",
  "locale.english": "English",
  "locale.french": "Français",
  "meta.description":
    "The Lyr’X music studio for reading, understanding, and sharing lyrics.",
  "meta.title": "Lyr’X — The lyrics studio",
  "navigation.account": "Account",
  "navigation.closeMenu": "Close menu",
  "navigation.continue": "Continue",
  "navigation.createAccount": "Create an account",
  "navigation.home": "Home",
  "navigation.menu": "Menu",
  "navigation.myProfile": "My profile",
  "navigation.openMenu": "Open menu",
  "navigation.signIn": "Sign in",
  "navigation.signOut": "Sign out",
  "notFound.description": "This address does not match any Lyr’X page.",
  "notFound.title": "Page not found",
  "onboarding.adminNotice":
    "Administration remains a separate permission assigned only on the server.",
  "onboarding.alreadyDescription": "Your role is {{role}}.",
  "onboarding.alreadyEdit": "Edit my profile",
  "onboarding.alreadyTitle": "Profile already created",
  "onboarding.artistProfile": "Artist profile",
  "onboarding.bio": "Bio",
  "onboarding.create": "Create my profile",
  "onboarding.description":
    "Your role organizes your experience. It does not grant a verified badge or ownership of an existing artist page.",
  "onboarding.emailUnverifiedDescription":
    "Verify {{email}}, then reload this page. You can also request another email from the verification page.",
  "onboarding.emailUnverifiedTitle": "Email not verified",
  "onboarding.handle": "Public handle",
  "onboarding.handleDescription":
    "Lowercase letters, numbers, dots, hyphens, or underscores.",
  "onboarding.handleInvalid":
    "Use 3 to 30 lowercase letters, numbers, dots, hyphens, or underscores.",
  "onboarding.presentation": "Introduction",
  "onboarding.profileCreated": "Profile created",
  "onboarding.profileError": "Profile not created",
  "onboarding.role": "Account role",
  "onboarding.roleDescription":
    "Artists will be able to publish their own content in the catalogue lots. Fans can submit content for moderation.",
  "onboarding.signInDescription": "Sign in before choosing your role.",
  "onboarding.signInTitle": "Sign-in required",
  "onboarding.suspendedDescription":
    "This account cannot create or edit a profile.",
  "preferences.language": "Language",
  "preferences.theme": "Theme",
  "profile.aboutArtist": "About the artist",
  "profile.addLink": "Add a link",
  "profile.artistIdentity": "Artist identity",
  "profile.avatar": "Avatar",
  "profile.avatarDescription": "JPEG, PNG, or WebP, up to 5 MB.",
  "profile.avatarUpdated": "Avatar updated",
  "profile.banner": "Banner",
  "profile.bannerDescription": "JPEG, PNG, or WebP, up to 10 MB.",
  "profile.bannerUpdated": "Banner updated",
  "profile.bio": "Bio",
  "profile.customLinkLabel": "Link {{number}} label",
  "profile.customLinkPlaceholder": "Official website",
  "profile.customLinkUrl": "Link {{number}} URL",
  "profile.customLinks": "Custom links",
  "profile.handle": "Handle",
  "profile.imageError": "Unable to upload the image",
  "profile.imageInvalidResponse": "The storage response is invalid.",
  "profile.imageUploadFailed": "The image upload failed.",
  "profile.images": "Profile images",
  "profile.imageUploading": "Uploading image…",
  "profile.noCustomLinks": "No custom links.",
  "profile.presentation": "Introduction",
  "profile.publicNotFoundDescription":
    "This profile does not exist or is not publicly visible.",
  "profile.publicNotFoundTitle": "Profile not found",
  "profile.removeLink": "Remove link {{number}}",
  "profile.save": "Save",
  "profile.saveError": "Unable to save changes",
  "profile.saved": "Profile saved",
  "profile.suspendedDescription":
    "This account can no longer edit or publish its profile.",
  "profile.unavailableDescription":
    "Finish onboarding after signing in and verifying your email.",
  "profile.unavailableTitle": "Profile unavailable",
  "profile.viewPublic": "View public profile",
  "theme.dark": "Dark",
  "theme.light": "Light",
  "theme.system": "System",
  "toast.signOutError": "Unable to sign out",
} satisfies Record<MessageKey, string>

export const UI_MESSAGES: Readonly<
  Record<SupportedLocale, Readonly<Record<MessageKey, string>>>
> = {
  fr: frenchMessages,
  en: englishMessages,
}

export function formatMessage(
  locale: SupportedLocale,
  key: MessageKey,
  values: Readonly<Record<string, string | number>> = {}
) {
  return Object.entries(values).reduce(
    (message, [name, value]) =>
      message.replaceAll(`{{${name}}}`, String(value)),
    UI_MESSAGES[locale][key]
  )
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === "fr" || value === "en"
}
