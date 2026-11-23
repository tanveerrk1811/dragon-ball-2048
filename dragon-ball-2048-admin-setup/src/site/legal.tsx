import { useEffect, useState } from 'react';
import { consent, type ConsentState } from '../game/consent';
import { Callout, Email, Ext, LegalPage, Section } from './components';
import { site } from './config';

export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <>
          This Privacy Policy explains what information {site.name} (“the website”, “we”, “us”) handles when you play,
          and the choices you have. The website is operated by <strong>{site.owner}</strong>.
        </>
      }
    >
      <nav className="toc" aria-label="Contents">
        <strong>Contents</strong>
        <ol>
          <li><a href="#collect">Information we collect</a></li>
          <li><a href="#local">Data stored on your device</a></li>
          <li><a href="#logs">Hosting, IP addresses and logs</a></li>
          <li><a href="#cookies">Cookies and similar technologies</a></li>
          <li><a href="#ads">Advertising and Google AdSense</a></li>
          <li><a href="#choices">Managing ad and cookie choices</a></li>
          <li><a href="#analytics">Analytics</a></li>
          <li><a href="#children">Children’s privacy</a></li>
          <li><a href="#retention">Data retention</a></li>
          <li><a href="#security">Data security</a></li>
          <li><a href="#links">Third-party links</a></li>
          <li><a href="#rights">Your privacy rights</a></li>
          <li><a href="#updates">Policy updates</a></li>
          <li><a href="#contact">Contact</a></li>
        </ol>
      </nav>

      <Section title="1. Information we collect">
        <p id="collect">
          The game has <strong>no user accounts, no registration, no comments and no contact form</strong>. We do not ask
          you for your name, email address or any other personal details to play, and we do not sell personal
          information.
        </p>
        <p>Some information is nevertheless processed automatically when you visit any website, including this one:</p>
        <ul>
          <li>
            <strong>Browser and device information</strong> such as browser type and version, operating system, screen
            size and language, which your browser sends with every request so that the page can be delivered and
            displayed correctly.
          </li>
          <li>
            <strong>IP address and request data</strong> (date and time, requested page, referring page) that our
            hosting provider receives when delivering the site — see “Hosting, IP addresses and logs” below.
          </li>
          <li>
            <strong>Advertising-related data</strong> collected by advertising partners when ads are displayed — see
            “Advertising and Google AdSense” below.
          </li>
        </ul>
        <p>
          If you email us, we receive your email address and whatever you choose to write, and we use it only to
          reply to you.
        </p>
      </Section>

      <Section title="2. Data stored on your device">
        <p id="local">
          To make the game work, it saves a small amount of data in your browser’s local storage. This stays on your
          device and is <strong>not sent to us</strong>:
        </p>
        <ul>
          <li>your current board and score, so you can resume a game;</li>
          <li>your best score and highest unlocked evolution;</li>
          <li>your sound on/off preference;</li>
          <li>your privacy / consent choice, if a consent message has been shown;</li>
          <li>
            technical information about advertising slots (for example whether an ad slot loaded), used only for
            troubleshooting on your device.
          </li>
        </ul>
        <p>You can erase all of this at any time by clearing the site data in your browser settings.</p>
      </Section>

      <Section title="3. Hosting, IP addresses and server logs">
        <p id="logs">
          The website is hosted by <Ext href="https://www.netlify.com/">{site.hosting}</Ext>. Like most hosting
          providers, {site.hosting} processes technical request data, including IP addresses, in order to deliver the
          site, keep it secure and operate its network, and it may keep server logs for a limited time under its own
          policies — see the <Ext href="https://www.netlify.com/privacy/">{site.hosting} Privacy Policy</Ext>. We do
          not use this information to identify individual visitors.
        </p>
      </Section>

      <Section title="4. Cookies and similar technologies">
        <p id="cookies">
          The game itself does not set tracking cookies. It uses local storage for the purposes described above.
          Cookies and similar technologies may be set by third-party advertising partners when advertising is
          enabled. Details, including how to control them, are in our <a href="/cookie-policy">Cookie Policy</a>.
        </p>
      </Section>

      <Section title="5. Advertising and Google AdSense">
        <p id="ads">
          The website is set up to show advertising through <strong>Google AdSense</strong> and may use other
          advertising networks in future. Advertising helps keep the game free. Ad slots are separate from the game
          board and controls.
        </p>
        <ul>
          <li>
            <strong>Third-party vendors, including Google, use cookies</strong> or similar technologies (such as
            device identifiers) to serve ads based on your previous visits to this and other websites, and to measure
            ad performance and prevent fraud.
          </li>
          <li>
            Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visit
            to this site and/or other sites on the Internet.
          </li>
          <li>
            <strong>Personalized ads</strong> use such data to show ads that may be relevant to your interests.{' '}
            <strong>Non-personalized ads</strong> are based mainly on the content you are viewing and general
            location, not on your past behaviour. Which type you see depends on your choices and on the law that
            applies where you are.
          </li>
          <li>
            Where consent is required — for example for visitors in the European Economic Area, the United Kingdom
            and Switzerland — ad scripts are configured to wait until you make a choice, and consent is handled
            through a Google-certified consent management platform when AdSense advertising is active.
          </li>
          <li>
            We do not receive your personal data from advertisers and we do not control the cookies set by them.
          </li>
        </ul>
        <p>
          Learn more:{' '}
          <Ext href="https://policies.google.com/technologies/ads">Google advertising technologies</Ext>,{' '}
          <Ext href="https://policies.google.com/technologies/partner-sites">
            how Google uses information from sites that use its services
          </Ext>
          .
        </p>
      </Section>

      <Section title="6. How to manage cookies and advertising preferences">
        <p id="choices">You are in control:</p>
        <ul>
          <li>
            Use the consent message on this site (where shown), or the controls on our{' '}
            <a href="/cookie-policy#choice">Cookie Policy</a> page.
          </li>
          <li>
            Opt out of personalized advertising from Google at{' '}
            <Ext href="https://adssettings.google.com">adssettings.google.com</Ext>.
          </li>
          <li>
            Opt out of many third-party vendors’ personalized advertising at{' '}
            <Ext href="https://www.aboutads.info/choices/">aboutads.info/choices</Ext> (US),{' '}
            <Ext href="https://www.youronlinechoices.com/">youronlinechoices.com</Ext> (EU) or{' '}
            <Ext href="https://optout.networkadvertising.org/">the NAI opt-out page</Ext>.
          </li>
          <li>Block or delete cookies in your browser settings (see the Cookie Policy). The game still works without them.</li>
        </ul>
      </Section>

      <Section title="7. Analytics">
        <p id="analytics">
          This website <strong>does not currently use an analytics service</strong>. If we add one (for example Google
          Analytics) we will update this policy and, where required, ask for your consent first.
        </p>
      </Section>

      <Section title="8. Children’s privacy">
        <p id="children">
          The game is a general-audience puzzle game that may appeal to younger players. We do not knowingly collect
          personal information from children under 13 (or the minimum age in your country). Because the game collects
          no account details, there is nothing for a child to submit to us. Parents or guardians who believe a child
          has sent us personal information (for example by email) can contact us and we will delete it. Advertising
          partners may handle data according to their own policies; parents can limit this using the controls in
          the section above and their device settings.
        </p>
      </Section>

      <Section title="9. Data retention">
        <p id="retention">
          Game data in your browser remains until you clear it. We do not run a database of visitors. Email
          correspondence is kept only as long as needed to handle your request. Hosting logs and advertising data are
          retained by {site.hosting} and the advertising partners under their own policies.
        </p>
      </Section>

      <Section title="10. Data security">
        <p id="security">
          The website is delivered over an encrypted HTTPS connection by our hosting provider, and because we do not
          collect account data, there is little personal data for us to protect. No method of transmission or storage
          is completely secure, so we cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="11. Third-party links">
        <p id="links">
          The website, and the ads shown on it, may link to external sites. We do not control them and are not
          responsible for their content or privacy practices. Please read their policies.
        </p>
      </Section>

      <Section title="12. Your privacy rights">
        <p id="rights">
          Depending on where you live (for example under the GDPR, UK GDPR or certain US state laws such as the
          CCPA/CPRA), you may have the right to access, correct, delete, restrict or object to the processing of your
          personal data, to withdraw consent at any time, to data portability, and to opt out of the “sale” or
          “sharing” of personal information for advertising, and to complain to your local data protection authority.
          We do not hold profile data about you, but you can contact us with any request and we will respond as
          required by law. For data held by Google or other ad partners, use their tools linked above.
        </p>
      </Section>

      <Section title="13. Policy updates">
        <p id="updates">
          We may update this policy from time to time. The “Last updated” date at the top shows when it last changed.
          Material changes will be reflected on this page.
        </p>
      </Section>

      <Section title="14. Contact">
        <p id="contact">
          Privacy questions or requests to {site.owner}: <Email subject="Privacy request" />. See also{' '}
          <a href="/contact">Contact Us</a>.
        </p>
      </Section>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      intro={
        <>
          These Terms of Use govern your use of {site.name} (“the website”), operated by <strong>{site.owner}</strong>.
          By using the website you agree to them. If you do not agree, please do not use it.
        </>
      }
    >
      <Section title="1. Gameplay and entertainment">
        <p>
          The website offers a free browser puzzle game for personal, non-commercial entertainment. Scores, unlocks and
          evolutions are for fun only and have no monetary value.
        </p>
      </Section>

      <Section title="2. Acceptable use">
        <p>When using the website you agree not to:</p>
        <ul>
          <li>attempt to hack, overload, disrupt or reverse-engineer the website in a way that harms it or other visitors;</li>
          <li>use bots, scripts or automated tools to generate ad impressions or clicks, or click ads for any reason other than genuine interest;</li>
          <li>copy and re-publish the website as your own, or remove notices about its unofficial fan-made status;</li>
          <li>use the website for anything unlawful, or to infringe other people’s rights.</li>
        </ul>
      </Section>

      <Section title="3. Website availability">
        <p>
          We aim to keep the website available, but we do not guarantee uninterrupted or error-free service. The site
          may be unavailable because of maintenance, hosting problems or events beyond our control, and we may change,
          suspend or discontinue features at any time. Game progress is stored in your own browser and may be lost if
          you clear your browser data or change devices.
        </p>
      </Section>

      <Section title="4. Intellectual property">
        <p>
          This is an <strong>unofficial fan-made project</strong>. “Dragon Ball” and all related names, characters and
          marks belong to their respective owners and are not owned by us. This website is not affiliated with,
          endorsed by, sponsored by, or officially connected to them. Our own contribution is the game software,
          layout and written content of this website. The merge mechanic is based on the open-source game <em>2048</em>{' '}
          by Gabriele Cirulli (MIT licence). If you are a rights holder with a concern, see our{' '}
          <a href="/dmca">Copyright / DMCA policy</a>.
        </p>
      </Section>

      <Section title="5. Third-party advertisements">
        <p>
          The website may display ads from third parties such as Google AdSense. We do not control or endorse
          advertisers or their products, and we are not responsible for transactions or dealings between you and any
          advertiser. See our <a href="/disclaimer">Disclaimer</a> and <a href="/cookie-policy">Cookie Policy</a>.
        </p>
      </Section>

      <Section title="6. External links">
        <p>
          The website, including its ads, may contain links to external websites that we do not operate. We are not
          responsible for their content or practices, and you use them at your own risk under their terms.
        </p>
      </Section>

      <Section title="7. Limitation of liability">
        <p>
          The website is provided “as is” and “as available”, without warranties of any kind to the extent permitted
          by law. To the maximum extent permitted by applicable law, {site.owner} will not be liable for indirect,
          incidental or consequential loss, loss of game progress or data, or for harm arising from third-party
          advertisements or external websites. Nothing in these terms limits liability that cannot lawfully be
          limited, including your statutory consumer rights where they apply.
        </p>
      </Section>

      <Section title="8. Changes to the website and these terms">
        <p>
          We may update the website or these terms from time to time. The “Last updated” date above shows the latest
          revision. Continuing to use the website after a change means you accept the updated terms.
        </p>
      </Section>

      <Section title="9. Privacy">
        <p>
          Our <a href="/privacy-policy">Privacy Policy</a> and <a href="/cookie-policy">Cookie Policy</a> explain how
          information is handled.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions about these terms: <Email subject="Terms question" /> or <a href="/contact">Contact Us</a>.
        </p>
      </Section>
    </LegalPage>
  );
}

function ConsentControls() {
  const [state, setState] = useState<ConsentState>(() => consent.get());
  useEffect(() => {
    consent.onChange(setState);
  }, []);
  const label = state === 'granted' ? 'Allowed' : state === 'denied' ? 'Declined' : 'No choice saved yet';
  return (
    <div className="callout" id="choice">
      <strong>Your choice on this browser</strong>
      <p>
        Optional advertising / analytics technologies: <strong>{label}</strong>
      </p>
      <p>
        This choice is saved in your browser’s local storage and only has an effect when advertising is switched on
        for the website. For Google ad personalization, also use{' '}
        <Ext href="https://adssettings.google.com">Google Ads Settings</Ext>.
      </p>
      <div className="btn-row-s">
        <button className="btn-s" type="button" onClick={() => consent.set('granted')}>
          Allow
        </button>
        <button className="btn-s" type="button" onClick={() => consent.set('denied')}>
          Decline
        </button>
        <button className="btn-s" type="button" onClick={() => consent.reset()}>
          Clear my choice
        </button>
      </div>
    </div>
  );
}

export function CookiePage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro={
        <>
          This policy explains the cookies and similar technologies relevant to {site.name}. It should be read with our{' '}
          <a href="/privacy-policy">Privacy Policy</a>.
        </>
      }
    >
      <Section title="1. What are cookies?">
        <p>
          Cookies are small text files that a website or its partners store on your device. Similar technologies, such
          as local storage, pixels and device identifiers, do comparable jobs. They can make sites work, remember
          settings, and — in the case of advertising — help serve and measure ads.
        </p>
      </Section>

      <Section title="2. Essential website functionality">
        <p>
          The game does not use cookies for sign-in or tracking. To work properly it stores game data (board, score,
          best score, highest evolution, sound preference and your privacy choice) in your browser’s{' '}
          <strong>local storage</strong>, not in cookies. This data stays on your device and is strictly necessary for
          saving your progress.
        </p>
      </Section>

      <Section title="3. Advertising cookies and Google AdSense">
        <p>
          The website is set up to display ads through Google AdSense. When ads are active, Google and its advertising
          partners may set or read cookies and similar identifiers (for example on Google advertising domains such
          as <code>google.com</code> and <code>doubleclick.net</code>) to:
        </p>
        <ul>
          <li>show ads and limit how often you see the same ad;</li>
          <li>personalize ads based on your earlier visits to this and other sites (only where permitted and chosen);</li>
          <li>measure ad performance, report on it, and detect fraud or abuse.</li>
        </ul>
        <p>
          Ad scripts are loaded only when advertising is enabled and, where consent is required, after you make a
          choice. See{' '}
          <Ext href="https://policies.google.com/technologies/cookies">how Google uses cookies</Ext> for details.
        </p>
      </Section>

      <Section title="4. Third-party cookies">
        <p>
          Third parties other than us — such as Google or other ad networks, if we use them — set their own cookies.
          We cannot access or control them, and they are governed by those parties’ privacy and cookie policies. If
          we add other third-party services, this page will be updated.
        </p>
      </Section>

      <Section title="5. Managing your cookie and advertising choices">
        <ConsentControls />
        <ul>
          <li>
            <strong>Google ad personalization:</strong>{' '}
            <Ext href="https://adssettings.google.com">adssettings.google.com</Ext>.
          </li>
          <li>
            <strong>Industry opt-outs:</strong>{' '}
            <Ext href="https://www.aboutads.info/choices/">aboutads.info/choices</Ext>,{' '}
            <Ext href="https://www.youronlinechoices.com/">youronlinechoices.com</Ext>,{' '}
            <Ext href="https://optout.networkadvertising.org/">networkadvertising.org</Ext>.
          </li>
          <li>
            <strong>Mobile devices:</strong> use your device’s advertising-ID controls (for example “Limit Ad
            Tracking” or “Opt out of Ads Personalization”).
          </li>
        </ul>
      </Section>

      <Section title="6. Disabling cookies in your browser">
        <p>You can block or delete cookies in your browser. Instructions:</p>
        <ul>
          <li><Ext href="https://support.google.com/chrome/answer/95647">Google Chrome</Ext></li>
          <li><Ext href="https://support.mozilla.org/kb/enhanced-tracking-protection-firefox-desktop">Mozilla Firefox</Ext></li>
          <li><Ext href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac">Apple Safari</Ext></li>
          <li><Ext href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09">Microsoft Edge</Ext></li>
        </ul>
        <p>
          Blocking cookies may reduce ad relevance, but the game works without them. Clearing site data also removes
          your saved game progress.
        </p>
      </Section>

      <Section title="7. Changes and contact">
        <p>
          We may update this policy when our advertising setup changes. Questions: <Email subject="Cookie policy question" />{' '}
          or <a href="/contact">Contact Us</a>.
        </p>
      </Section>
    </LegalPage>
  );
}

export function DmcaPage() {
  return (
    <LegalPage
      title="Copyright & DMCA Policy"
      intro={
        <>
          We respect the rights of creators and rights holders. This page explains how to report content on {site.name}{' '}
          that you believe infringes your copyright.
        </>
      }
    >
      <Callout tone="warn" title="Unofficial fan project">
        <p>
          {site.name} is an unofficial, fan-made project. It is not affiliated with, endorsed by, sponsored by, or
          officially connected to Dragon Ball, its creators, publishers or rights holders. The website may contain
          fan-made content and references to third-party intellectual property, including character names and
          anime-style character portraits. Labelling the project “unofficial” or “fan-made” does{' '}
          <strong>not</strong> by itself make any use of copyrighted material lawful, and we do not claim that it does.
        </p>
      </Callout>

      <Section title="1. Submitting a removal request">
        <p>
          If you are the copyright owner (or authorised to act for them) and believe material on this website infringes
          your rights, send a written notice to <Email subject="Copyright / DMCA notice" /> including:
        </p>
        <ol>
          <li>Your full name, your company (if any), and your contact details (email and postal address or phone).</li>
          <li>A description of the copyrighted work you claim has been infringed.</li>
          <li>
            The exact location of the material on our website (page URL, and a description such as the character or
            screen) so we can find it.
          </li>
          <li>A statement that you have a good-faith belief that the use is not authorised by the copyright owner, its agent or the law.</li>
          <li>
            A statement that the information in your notice is accurate and, under penalty of perjury, that you are the
            owner or are authorised to act for the owner.
          </li>
          <li>Your physical or electronic signature.</li>
        </ol>
        <p>
          Contact email for notices: <Email subject="Copyright / DMCA notice" />. Addressed to: {site.owner}, owner of{' '}
          {site.name}.
        </p>
      </Section>

      <Section title="2. What happens next">
        <p>
          We review valid, complete notices promptly and, where appropriate, take action such as removing or
          disabling access to the material. We may contact you for more information and may notify the person who
          supplied the material. Incomplete notices may not be actionable. Knowingly submitting a false claim can
          carry legal consequences.
        </p>
      </Section>

      <Section title="3. Counter-notice">
        <p>
          If you believe material was removed by mistake or misidentification, you may send a counter-notice with your
          contact details, a description of the removed material and where it appeared, a statement under penalty of
          perjury that you have a good-faith belief it was removed by mistake, and your signature.
        </p>
      </Section>

      <Section title="4. Repeat infringement">
        <p>In appropriate circumstances we will disable or remove material submitted by repeat infringers.</p>
      </Section>

      <Section title="5. Other rights and trademarks">
        <p>
          Trademark or other intellectual-property concerns can be sent to the same address. This policy is general
          information, not legal advice. If you are unsure about your rights, consult a qualified professional.
        </p>
      </Section>

      <Section title="6. Related pages">
        <p>
          <a href="/terms-and-conditions">Terms &amp; Conditions</a> · <a href="/disclaimer">Disclaimer</a> ·{' '}
          <a href="/contact">Contact Us</a>
        </p>
      </Section>
    </LegalPage>
  );
}
