import React, {useCallback, useEffect, useState} from 'react';
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Realm from 'realm';
import {TODO_SCHEMA} from '../databases/allSchemas';
import {checkInternetConnection} from 'react-native-offline';

const TodoSchema = {
  name: TODO_SCHEMA,
  properties: {
    name: 'string',
    status: 'string?',
  },
};

const Main = () => {
  const [tasks, setTasks] = useState([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [isConnected, setConnected] = useState(true);
  const app = Realm.App.getApp('test-off-reedt');

  // React.useEffect(() => {
  //   (async () => {
  //     const connectionStatus = await checkInternetConnection();
  //     setConnected(connectionStatus);
  //   })();
  // }, []);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      checkInternetConnection()
        .then(res => setConnected(res))
        .catch(e => console.log(`error getting status : ${e}`));
    }, 1000);
    return () => clearInterval(syncInterval);
  });

  useEffect(() => {
    async function getDataOnline() {
      const user = await app.logIn(Realm.Credentials.anonymous());
      const mongodb = app.currentUser.mongoClient('mongodb-atlas');
      const tasksList = mongodb.db('myTest').collection('Todo');
      const customData = await tasksList.find();
      setTasks(customData);
    }
    if (isConnected) {
      getDataOnline();
    } else {
      Realm.open({
        path: 'myrealm',
        schema: [TodoSchema],
        schemaVersion: 2,
      }).then(realm => {
        const tasksRealm = realm.objects(TODO_SCHEMA);
        setTasks(tasksRealm);
        console.log(tasksRealm);
        tasksRealm.addListener(() => {
          setTasks(tasks => [...tasks, ...tasksRealm]);
        });
        return () => {
          const tasks = realm.objects(TODO_SCHEMA);
          tasks.removeAllListeners();
          realm.close();
        };
      });
    }
  }, [app, isConnected]);

  const onSave = useCallback(() => {
    async function saveOnlineData() {
      const user = await app.logIn(Realm.Credentials.anonymous());
      const mongodb = app.currentUser.mongoClient('mongodb-atlas');
      const todoList = mongodb.db('myTest').collection('Todo');
      const body = {
        name,
        status,
      };
      await todoList.insertOne(body);
    }
    if (isConnected) {
      saveOnlineData();
    } else {
      Realm.open({
        path: 'myrealm',
        schema: [TodoSchema],
      }).then(realm => {
        realm.write(() => {
          realm.create(TODO_SCHEMA, {
            name,
            status,
          });
        });
      });
    }
    setName('');
    setStatus('');
  }, [name, status, app, isConnected]);

  const renderItem = ({item}) => {
    return (
      <View style={styles.itemBlock}>
        <Text style={styles.item}>{item.name}</Text>
        <Text style={[styles.item, item.status === 'process' && styles.active]}>
          {item.status}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View>
          <TextInput
            style={styles.input}
            onChangeText={setName}
            value={name}
            placeholder="name"
          />
          <TextInput
            style={styles.input}
            onChangeText={setStatus}
            value={status}
            placeholder="status"
          />
          <View>
            <TouchableOpacity style={styles.touchable} onPress={onSave}>
              <Text style={styles.text}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          data={tasks}
          renderItem={renderItem}
          keyExtractor={item => item._id}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    backgroundColor: '#fff',
    flex: 1,
  },
  itemBlock: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomColor: '#f5f5f5',
    borderBottomWidth: 1,
  },
  item: {
    flex: 1,
    padding: 10,
  },
  active: {
    color: 'green',
  },
  fail: {
    color: 'red',
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
  touchable: {
    padding: 10,
    margin: 10,
    width: 100,
    backgroundColor: 'green',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#fff',
  },
});

export default Main;
