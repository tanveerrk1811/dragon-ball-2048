import { CHARACTERS } from '../game/characters';
import { Callout, Email, Ext, LegalPage, Section } from './components';
import { site } from './config';

export function AboutPage() {
  return (
    <LegalPage
      title="About Us"
      showUpdated={false}
      intro={
        <>
          <strong>{site.name}</strong> is a free, browser-based merge puzzle inspired by the classic <em>2048</em>.
          Instead of numbered tiles you slide and merge fighters, and every merge evolves them into a stronger form.
        </>
      }
    >
      <Callout tone="warn" title="Unofficial fan-made project">
        <p>
          {site.name} is an <strong>unofficial fan project</strong>. It is{' '}
          <strong>not affiliated with, endorsed by, sponsored by, or officially connected to</strong> Dragon Ball, its
          creators, publishers, animation studios or any rights holders. Dragon Ball and all related names,
          characters and marks belong to their respective owners. We do not claim ownership of, or a licence to,
          any Dragon Ball intellectual property.
        </p>
      </Callout>

      <Section title="What is Dragon Ball 2048 — Power Evolution?">
        <p>
          It is a single-player puzzle game played on a 4×4 board. Fighters of the same kind merge into the next
          evolution in a long “power chain”, starting with Kid Goku and climbing through famous warriors and
          transformations. The aim is to keep merging until you reach <strong>Super Saiyan God Goku (2048)</strong> —
          and then, if you like, keep going to unlock the even more powerful forms beyond it.
        </p>
        <p>
          The game runs entirely in your web browser. There is nothing to download, no account to create and no
          payment required.
        </p>
      </Section>

      <Section title="How to play">
        <ol>
          <li>
            <strong>Slide the board.</strong> Swipe on a touch screen, or use the arrow keys / WASD on a keyboard.
            Every fighter slides as far as it can in that direction.
          </li>
          <li>
            <strong>Merge identical fighters.</strong> When two identical fighters collide they merge into the next
            evolution and add to your score.
          </li>
          <li>
            <strong>A new fighter appears</strong> after every valid move — usually a Kid Goku, sometimes a Krillin.
          </li>
          <li>
            <strong>Plan ahead.</strong> Keep your strongest fighter in a corner and keep the board from filling up.
          </li>
          <li>
            <strong>Win or keep going.</strong> Reaching Super Saiyan God Goku (2048) wins the round. You can then
            choose “Keep going” to chase the remaining transformations.
          </li>
          <li>
            <strong>Game over</strong> happens when the board is full and no merges are left. Press <strong>R</strong>{' '}
            or the restart button to try again.
          </li>
        </ol>
      </Section>

      <Section title="The character evolution concept">
        <p>
          Each tile value is a character, and merging two of the same moves them one step along this chain. Your
          highest unlocked form is remembered on your device, so you can see your progress over time.
        </p>
        <ol className="chain" aria-label="Evolution chain">
          {CHARACTERS.map((c) => (
            <li key={c.value}>
              <b>{c.value}</b>
              <span>
                {c.name}
                <em>{c.title}</em>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Game features">
        <div className="cards">
          <div>
            <h3>Evolution progress</h3>
            <p>See your current form, the next evolution you are working towards, and a progress bar.</p>
          </div>
          <div>
            <h3>Touch &amp; keyboard</h3>
            <p>Swipe on phones and tablets, or use arrow keys / WASD on desktop.</p>
          </div>
          <div>
            <h3>Automatic saving</h3>
            <p>Your board, best score and highest evolution are saved locally on your device.</p>
          </div>
          <div>
            <h3>Evolution guide</h3>
            <p>An in-game guide shows every form in the chain and which ones you have unlocked.</p>
          </div>
          <div>
            <h3>Sound toggle</h3>
            <p>Sound effects can be switched on or off at any time.</p>
          </div>
          <div>
            <h3>Responsive design</h3>
            <p>Built to fit phones, tablets and desktop screens without scrolling the board.</p>
          </div>
        </div>
      </Section>

      <Section title="Free to play">
        <p>
          The game is free and always will be playable without paying. To help cover the costs of running a website,
          it may display advertisements (for example through Google AdSense). Ads are kept separate from the
          board and the game controls. See our <a href="/disclaimer">Disclaimer</a> and{' '}
          <a href="/privacy-policy">Privacy Policy</a> for details.
        </p>
      </Section>

      <Section title="Project ownership">
        <p>
          This website and game software are created and operated by <strong>{site.owner}</strong>. It is built with
          React, Vite and TypeScript, hosted on {site.hosting}, and the source code is kept in a public{' '}
          <Ext href={site.repoUrl}>GitHub repository</Ext>.
        </p>
        <p>
          The merge mechanic is based on the open-source game <em>2048</em> by Gabriele Cirulli (MIT licence).
        </p>
        <p>
          The character portraits in the game depict characters from the Dragon Ball franchise in an anime style as a
          fan tribute; the rights to those characters belong to their respective owners. If you are a rights holder,
          please read our <a href="/dmca">Copyright / DMCA policy</a>.
        </p>
      </Section>

      <Section title="Get in touch">
        <p>
          Questions, bug reports or feedback? Visit our <a href="/contact">Contact Us</a> page.
        </p>
      </Section>
    </LegalPage>
  );
}

export function ContactPage() {
  const configured = Boolean(site.contactEmail);
  return (
    <LegalPage
      title="Contact Us"
      showUpdated={false}
      intro={
        <>
          {site.name} is created and run by <strong>{site.owner}</strong>. You are welcome to get in touch about the
          game, bugs, privacy questions or copyright matters.
        </>
      }
    >
      <Section title="Email">
        <p>
          Contact email: <Email subject={`${site.shortName} — enquiry`} />
        </p>
        <p>
          This website does not use an online contact form. Messages are sent from your own email app, so nothing you
          write is collected or stored by this site.
        </p>
      </Section>

      {!configured && (
        <Callout tone="warn" title="Owner setup required: contact email not configured">
          <p>
            No email address has been set yet, and none has been invented. To publish your real address on every
            page (Contact, Privacy, Terms, Disclaimer, Cookie and DMCA pages):
          </p>
          <ol>
            <li>
              Open <code>src/site/config.ts</code>.
            </li>
            <li>
              Set <code>contactEmail: 'your-address@example.com'</code> (use an address you actually monitor).
            </li>
            <li>
              Rebuild and redeploy (<code>npm run build</code>, then push to GitHub so Netlify redeploys).
            </li>
          </ol>
          <p>This notice disappears automatically once an address is set.</p>
        </Callout>
      )}

      <Section title="What to contact us about">
        <div className="cards">
          <div>
            <h3>Bugs &amp; feedback</h3>
            <p>Tell us your device, browser and what happened, so we can reproduce the problem.</p>
          </div>
          <div>
            <h3>Privacy requests</h3>
            <p>
              Questions about this site’s <a href="/privacy-policy">Privacy Policy</a> or how to manage cookies.
            </p>
          </div>
          <div>
            <h3>Copyright notices</h3>
            <p>
              Rights holders should follow the steps in our <a href="/dmca">Copyright / DMCA policy</a>.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Please note">
        <ul>
          <li>We aim to read every message, but we are a small independent project and cannot promise a reply time.</li>
          <li>We will never ask you for passwords or payment details by email.</li>
          <li>
            We cannot help with questions about advertisements you see (please contact the advertiser or the ad
            network) or about the official Dragon Ball franchise — this site is unofficial.
          </li>
        </ul>
      </Section>

      <Section title="Owner">
        <p>
          {site.owner} — owner and developer of {site.name}.
        </p>
      </Section>
    </LegalPage>
  );
}

export function DisclaimerPage() {
  return (
    <LegalPage
      title="Disclaimer"
      intro={
        <>
          Please read this disclaimer together with our <a href="/terms-and-conditions">Terms &amp; Conditions</a> and{' '}
          <a href="/privacy-policy">Privacy Policy</a>.
        </>
      }
    >
      <Section title="1. Entertainment purposes only">
        <p>
          {site.name} is a browser game provided for entertainment. Nothing on this website is professional, financial,
          legal or medical advice. Scores, unlocks and progress have no monetary value.
        </p>
      </Section>

      <Section title="2. Unofficial fan project">
        <p>
          This is an unofficial, fan-made project. It is not affiliated with, endorsed by, sponsored by, or officially
          connected to Dragon Ball, its creators, publishers or rights holders. Dragon Ball and all related names and
          characters are the property of their respective owners. Referring to them here does not give us any right
          to them, and this disclaimer does not, by itself, make any use of third-party material lawful. See our{' '}
          <a href="/dmca">Copyright / DMCA policy</a>.
        </p>
      </Section>

      <Section title="3. Advertising">
        <ul>
          <li>
            This website may display advertising through <strong>Google AdSense</strong> or other advertising networks.
          </li>
          <li>
            Third-party advertising providers may use cookies, device identifiers or similar technologies to serve and
            measure ads. Their use of data is governed by their own privacy policies — see our{' '}
            <a href="/cookie-policy">Cookie Policy</a> and{' '}
            <Ext href="https://policies.google.com/technologies/partner-sites">
              How Google uses information from sites that use its services
            </Ext>
            .
          </li>
          <li>
            We do not control the content of third-party advertisements and do not select individual ads shown to you.
          </li>
          <li>
            The appearance of an advertisement does not mean we endorse, recommend or are affiliated with the advertised
            product, service or company.
          </li>
          <li>
            Clicking an advertisement is entirely your own choice. Please never click ads to “support” the site on
            our behalf, and we ask nobody to do so.
          </li>
          <li>
            You can manage ad personalisation through{' '}
            <Ext href="https://adssettings.google.com">Google Ads Settings</Ext>.
          </li>
        </ul>
      </Section>

      <Section title="4. External websites">
        <p>
          Advertisements or links on this website may lead to external websites. Those sites have their own terms and
          privacy policies, and we are not responsible for their content, accuracy, security or practices. Visit them
          at your own discretion.
        </p>
      </Section>

      <Section title="5. No warranty on availability or accuracy">
        <p>
          We work to keep the game running smoothly, but it is provided “as is” and “as available”. We do not
          guarantee that it will be error-free, uninterrupted or that saved progress will never be lost (progress is
          stored in your own browser and can be erased if you clear your browsing data). Nothing in this disclaimer
          excludes any liability or consumer right that cannot be excluded under the law that applies to you.
        </p>
      </Section>

      <Section title="6. Contact">
        <p>
          Questions about this disclaimer: <Email subject="Disclaimer question" /> or see <a href="/contact">Contact Us</a>.
        </p>
      </Section>
    </LegalPage>
  );
}

export function NotFoundPage() {
  return (
    <article className="prose nf">
      <p className="big" aria-hidden="true">
        404
      </p>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist or may have moved.</p>
      <p>
        <a className="btn-s" href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
          ▶ Back to the game
        </a>
      </p>
    </article>
  );
}
