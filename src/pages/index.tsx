import styles from './HomePage.module.css';
import ShadowMapping from '../sample/shadowMapping/main';

const HomePage: React.FunctionComponent = () => {
  return (
    <main className={styles.homePage}>
      <ShadowMapping/>
    </main>
  );
};

export default HomePage;
