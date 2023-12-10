import styles from './HomePage.module.css';
import SnowAccumulation from '../sample/snowAccumulation/main';

const HomePage: React.FunctionComponent = () => {
  return (
    <main className={styles.homePage}>
      <SnowAccumulation/>
    </main>
  );
};

export default HomePage;
